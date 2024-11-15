
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
}