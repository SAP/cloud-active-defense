const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: __dirname + '/.env' });
const { CONFIGMANAGER_URL } = require('./util/variables');
const { CONTROLPANEL_URL } = require('./util/variables');
const { sendDataToConfigmanager } = require('./services/configmanager');

const configmanager = require('./routes/configmanager');
const decoys = require('./routes/decoys');
const decoy = require('./routes/decoy');
const statistics = require('./routes/statistics');
const logs = require('./routes/logs');
const config = require('./routes/config');
const user = require('./routes/user');
const protectedApp = require('./routes/protected-app');

const app = express();
app.use(express.json());
app.use(cors({ origin: CONTROLPANEL_URL }));

app.use('/configmanager', configmanager);
app.use('/decoys', decoys);
app.use('/decoy', decoy);
app.use('/statistics', statistics);
app.use('/logs', logs);
app.use('/config', config)
app.use('/user', user);
app.use('/protected-app', protectedApp);

app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ type: 'error', code: 400, message: "The provided json is invalid", data: err });
    }
    next();
});

app.listen(8050, async () => {
    console.log("Control panel API started on port 8050 !");
    try {
        // CONFIGMANAGER URL
        await fetch(CONFIGMANAGER_URL);
        console.log("Successfully connected to configmanager !")
        setInterval(async () => await sendDataToConfigmanager(), 60 * 60 * 1000)
    } catch(e) {
        console.error("Configmanager is not up, please (re)start configmanager");
    }
    require('./models/index');
});