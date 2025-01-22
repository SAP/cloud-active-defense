const { Op } = require('sequelize');
const Logs = require('../models/Logs');
const { isJSON } = require('../util');

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
            filter = { pa_id };
            allowedFields = [];
            if (query.type) {
                filter.type = query.type;
                if (query.type == 'alert') {
                    allowedFields = ['RequestID', 'Destination', 'Url', 'Server', 'SourceIp',
                        'Authenticated', 'Session', 'Username', 'UserAgent', 'Path', 'Method',
                        'DecoyType', 'DecoyKey', 'DecoyExpectedValue', 'DecoyInjectedValue', 'Severity'];
                }
                else if (query.type == 'event') {
                    allowedFields = ['Behavior', 'Source', 'Delay', 'Duration'];
                }
            }
            if (query.date && !isNaN(query.date)) filter.date = query.date

            for (const key in query) {
                if (!allowedFields.includes(key)) continue;
                else filter.content = {};
                const value = query[key];
                if (key == 'severity' || key == 'behavior') {
                    filter.content[key] = value.split(',');
                    continue;
                }
                const [ operator, operand ] = value.split(':');
                if (operand == undefined ) {
                    filter.content[key] = operator;
                    continue;
                } 
                switch (operator) {
                    case 'equal':
                        filter.content[key] = operator
                        break;
                    case 'like':
                        filter.content[key] = { [Op.like]: `%${operand}%` };
                        break;
                    case 'notequal':
                        filter.content[key] = { [Op.ne]: operand };
                        break;
                    case 'notlike':
                        filter.content[key] = { [Op.notLike]: operand };
                    default:
                        continue;
                }
            }
            const logs = await Logs.findAll({ where: filter });
            return { code: 200, type: 'success', message: 'Successful operation', data: logs };
        } catch (e) {
            throw e;
        }
    },
    /**
     * Create log in db
     * @param {[{date?: number, log: string}]} logs logs array input (.log must be stringified JSON)
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
                if (!isJSON(log.log)) {
                    errors.push({ log, error: '.log attribute is not a JSON' });
                    continue;
                }
                const logContent = JSON.parse(log.log);
                if (!logContent.type) {
                    errors.push({ log, error: '.type attribute in .log is missing or empty' });
                    continue;
                }
                Logs.create({ date: log.date, type: logContent.type, content: logContent.content });
            }
            return { code: 200, type: 'success', message: 'Successful operation', data: errors };
        } catch(e) {
            throw e;
        }
    }
}