const Blocklist = require('../models/Blocklist')
const { Op } = require('sequelize');

async function sortBlocklistDuplicates(newBlocklist, pa_id) {
    const finalBlocklist = [];
    const finaleThrottlelist = [];
    const allSources = Object.fromEntries(['SourceIp', 'Session', 'UserAgent']
    .map(key => [key, [...newBlocklist.blocklist, ...newBlocklist.throttle].find(item => item[key])?.[key]])
    .filter(([, value]) => value !== undefined));
    const existingBlocklist = await Blocklist.findAll({ where: {
        pa_id,
        type: 'blocklist',
        [Op.or]: Object.entries(allSources).map(([key, value]) => ({
            [`content.${key}`]: value
        }))}
    });
    const existingThrottlelist = await Blocklist.findAll({ where: {
        pa_id,
        type: 'throttle',
        [Op.or]: Object.entries(allSources).map(([key, value]) => ({
            [`content.${key}`]: value
        }))}
    });
    for (const newItem of newBlocklist.blocklist) {
        const sourceKeys = ['SourceIp', 'Session', 'UserAgent'].filter(key => newItem[key] !== undefined);
        const match = existingBlocklist.find(existing => 
        sourceKeys.length > 0 &&
        sourceKeys.every(key => existing.content[key] === newItem[key]) &&
        sourceKeys.every(key => existing.content[key] !== undefined) &&
        sourceKeys.length === Object.keys(existing.content).filter(key => sourceKeys.includes(key) && existing.content[key] !== undefined).length);
        if (!match) {
            finalBlocklist.push(newItem);
            continue;
        }
        if(isNewBlocklistBehaviorPriority(match, newItem)) {
            Blocklist.destroy({ where: { id: match.id } })
            finalBlocklist.push(newItem);
        }
    }
    for (const newItem of newBlocklist.throttle) {
        const sourceKeys = ['SourceIp', 'Session', 'UserAgent'].filter(key => newItem[key] !== undefined);
        const match = existingThrottlelist.find(existing => 
        sourceKeys.length > 0 &&
        sourceKeys.every(key => existing.content[key] === newItem[key]) &&
        sourceKeys.every(key => existing.content[key] !== undefined) &&
        sourceKeys.length === Object.keys(existing.content).filter(key => sourceKeys.includes(key) && existing.content[key] !== undefined).length);
        if (match && isNewBlocklistBehaviorPriority(match, newItem)) {
            Blocklist.destroy({ where: { id: match.id } })
            finaleThrottlelist.push(newItem);
        }
    }
    return { blocklist: finalBlocklist, throttle: finaleThrottlelist };
}

function isNewBlocklistBehaviorPriority(existingBlocklist, newBlocklist) {
    const priorities = { clone: 1, exhaust: 2, drop: 3, error: 4 };
    return priorities[newBlocklist.Behavior] < priorities[existingBlocklist.content.Behavior]
}

module.exports = {
    sortBlocklistDuplicates
}