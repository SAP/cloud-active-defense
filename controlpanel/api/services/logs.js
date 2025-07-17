const { Op } = require('sequelize');
const Logs = require('../models/Logs');
const { isJSON, isUUID } = require('../util');
const sequelize = require('../models');
const ProtectedApp = require('../models/ProtectedApp');

module.exports = {
    /**
     * Return logs collected and filtered with `query`
     * @param {Object} query query filter
     * @returns {{type: 'success' | 'error' | 'warning', code: number, message: string, data: [Model]}}
     * 
     * Examples:
     * 
     *      getLogs('126f2bd9-9431-4590-a18b-3f980479953a', {type: 'alert', DecoyKey: 'like:some decoy'})
     *      getLogs('126f2bd9-9431-4590-a18b-3f980479953a', {type: 'event', Delay: 'equal:120'})
     */
    getLogs : async (pa_id, query) => {
        try {
            // filter = { pa_id };
            if (!isUUID(pa_id)) return { code: 400, type: 'error', message: 'Invalid pa_id supplied' };
            alertFields = ['Time', 'RequestID', 'Destination', 'Url', 'Server', 'SourceIp',
                        'Authenticated', 'Session', 'Username', 'UserAgent', 'Path', 'Method',
                        'DecoyType', 'DecoyKey', 'DecoyExpectedValue', 'DecoyInjectedValue', 'Severity'];
            eventFields = ['Behavior', 'SourceIp', 'UserAgent', 'Session', 'Delay', 'Duration'];
            filter = { [Op.and]: [{pa_id}] };
            allowedFields = [];
            if (query.type) {
                if (query.type == 'applog') filter.type = ['debug', 'system'];
                else filter.type = query.type;
                if (query.type == 'alert') {
                    allowedFields.push(...alertFields);
                }
                else if (query.type == 'event') {
                    allowedFields.push(...eventFields);
                }
            }
            if (query.time && typeof query.time == 'string' && ['h', 'd', 'm'].includes(query.time[query.time.length-1]) && !isNaN(query.time.slice(0, -1))) {
                switch (query.time[query.time.length - 1]) {
                    case 'h':
                        filter.date = { [Op.gte]: Math.floor(new Date(new Date() - query.time.slice(0, -1) * 60 * 60 * 1000).getTime() / 1000) };
                        break;
                    case 'd':
                        filter.date = { [Op.gt]: Math.floor(new Date(new Date() - query.time.slice(0, -1) * 24 * 60 * 60 * 1000).getTime() / 1000) };
                        break;
                    case 'm':
                        filter.date = { [Op.gt]: Math.floor(new Date(new Date() - query.time.slice(0, -1) * 30 * 24 * 60 * 60 * 1000).getTime() / 1000) };
                        break;
                    default:
                        break;
                }
            }

            for (const key in query) {
                if (!allowedFields.includes(key)) continue;
                else filter.content = {};
                const value = query[key];
                if (typeof value !== 'string' || !value) continue;
                // if (key == 'severity' || key == 'behavior') {
                //     filter.content[key] = value.split(',');
                //     continue;
                // }
                const [ operator, operand ] = value.includes(':') ? value.split(':') : `equal:${value}`.split(':');
                if (operand == undefined ) {
                    filter.content[key] = operator;
                    continue;
                } 
                switch (operator) {
                    case 'equal':
                        if (eventFields.includes(key)) filter[Op.and].push({
                            [Op.or]:[
                                { content:{ [Op.contains]:{ action:[{[key]:operand}]}}},
                                { content:{ [Op.contains]:{ throttle:[{[key]:operand}]}}}
                            ]});
                        else filter.content[key] = operand;
                        break;
                    case 'like':
                        if (eventFields.includes(key)) filter[Op.and].push({
                                [Op.or]:[
                                    sequelize.where(sequelize.cast(sequelize.col('content'), 'text'), {[Op.iRegexp]: `"${key}"\\s*:\\s*".*${operand}.*"`}),
                                ]
                            });
                        else filter.content[key] = { [Op.like]: `%${operand}%` };
                        break;
                    case 'notequal':
                        if (eventFields.includes(key)) filter[Op.and].push({
                            [Op.not]: {
                                [Op.or]:[
                                    { content: { [Op.contains]:{ action: [{[key]:operand}]}}},
                                    { content: { [Op.contains]:{ throttle: [{[key]:operand}]}}}
                                ]
                            }});
                        else filter.content[key] = { [Op.ne]: operand };
                        break;
                    case 'notlike':
                        if (eventFields.includes(key)) filter[Op.and].push({
                            [Op.not]: {
                                [Op.or]:[
                                    sequelize.where(sequelize.cast(sequelize.col('content'), 'text'), {[Op.regexp]: `"${key}"\\s*:\\s*".*${operand}.*"`})
                                ]
                            }});
                        else filter.content[key] = { [Op.notLike]: operand };
                    default:
                        continue;
                }
            }
            const logs = await Logs.findAll({ where: filter, order: [['date', 'DESC']] });
            return { code: 200, type: 'success', message: 'Successful operation', data: logs };
        } catch (e) {
            throw e;
        }
    },
    /**
     * Create log in db
     * @param {[{date?: number, log: string, namespace: string, application: string}]} logs logs array input (.log must be stringified JSON)
     * @returns {{type: 'success' | 'error' | 'warning', code: number, message: string, data?: []}}
     */
    createLogs: async (logs) => {
        try {
            errors = [];
            if (!logs.length) return { code: 400, type: 'error', message: 'No logs provided' };
            for (const log of logs) {
                if (!log.log) {
                    errors.push({ log, error: '.log attribute is missing or empty' }); 
                    continue;
                }
                if (typeof log.date != 'number') {
                    errors.push({ log, error: '.data is not a number' });
                }
                if (log.log.length > 1500) {
                    errors.push({ log, error: '.log attribute is too long' });
                }
                const matchLog = log.log.match(/.*cad-filter:\s*(?<log>.*)(?:\s|\\t).*$/);
                if (matchLog != null) log.log = matchLog.groups.log;
                if (!isJSON(log.log)) {
                    errors.push({ log, error: '.log attribute is not a JSON' });
                    continue;
                }
                const logContent = JSON.parse(log.log);
                if (!logContent.type) {
                    errors.push({ log, error: '.type attribute in .log is missing or empty' });
                    continue;
                }
                if (!log.namespace && !log.application){
                    errors.push({ log, error: 'Either .namespace or .application attribute is missing or empty' });
                    continue;
                }
                const protectedApp = await ProtectedApp.findOne({ where: { namespace: log.namespace, application: log.application } });
                if (!protectedApp) {
                    errors.push({ log, error: 'Protected app not found' });
                    continue;
                }
                Logs.create({ date: log.date, type: logContent.type, content: logContent.content, pa_id: protectedApp.id });
            }
            return { code: 200, type: 'success', message: 'Successful operation', data: errors };
        } catch(e) {
            throw e;
        }
    }
}