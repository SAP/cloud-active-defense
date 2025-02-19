const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: __dirname + '/.env' });
const { initializeDatabase } = require('./models/index');

const configmanager = require('./routes/configmanager');
const decoys = require('./routes/decoys');
const decoy = require('./routes/decoy');
const statistics = require('./routes/statistics');
const logs = require('./routes/logs');
const config = require('./routes/config');
const user = require('./routes/user');
const protectedApp = require('./routes/protected-app');
const { createProtectedApp } = require('./services/protected-app');
const { createDecoy } = require('./services/decoy');
const { updateConfig } = require('./services/config');

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CONTROLPANEL_FRONTEND_URL }));

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
    await initializeDatabase();
    const defaultApp = await createProtectedApp({ namespace: 'default', application: 'default' }); 
    createDecoy({ pa_id: defaultApp.data.id, decoy:{decoy:{key:"x-cloud-active-defense",separator:"=",value:"ACTIVE"},inject:{store:{inResponse:".*",as:"header"}}}});
    updateConfig({ pa_id:defaultApp.data.id, deployed: true, config:{alert:{session:{in:"cookie",key:"SESSION"}}}});
});