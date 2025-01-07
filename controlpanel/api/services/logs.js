const Logs = require('../models/Logs');
const { isJSON } = require('../util');

module.exports = {
    /**
     * Return logs collected and filtered with `filter`
     * @param {Object} filter 
     */
    getLogs : async (filter) => {
        try {
            //TODO
            return { type:'success',data:[{"Time":1715956535,"RequestID":"f916b220-3c2c-493d-9ff4-a543bc39816c","DestinationIP":"172.19.0.5:8000","Url":"localhost:8000","Server":"myapp","SourceIP":"172.19.0.1:35692","Authenticated":true,"Session":"c32272b9-99d8-4687-b57e-a606952ae870","Username":"Bob","Useragent":"Mozilla/5.0(X11;Ubuntu;Linuxx86_64;rv:125.0)Gecko/20100101Firefox/125.0","Path":"/","Method":"GET","DecoyType":"KeyValueModified","DecoyKey":"role","DecoyExpectedValue":"user","DecoyInjectedValue":"admin","Severity":"HIGH" }] }
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