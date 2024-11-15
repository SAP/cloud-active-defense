const express = require('express');

const decoys = require('./routes/decoys');
const statistics = require('./routes/statistics');
const logs = require('./routes/logs');
const config = require('./routes/config');
const user = require('./routes/user');

const app = express();
app.use(express.json());

app.use('/decoys', decoys);
app.use('/statistics', statistics);
app.use('/logs', logs);
app.use('/config', config)
app.use('/user', user);

app.listen(8050, async () => {
    console.log("Control panel API started on port 8050 !");
    try {
        // CONFIGMANAGER URL
        await fetch('http://localhost:3000'); // CHANGE ME TO CONFIGMANAGER TO WORK WITH DOCKER COMPOSE
    } catch(e) {
        console.error("Configmanager is not up, please (re)start configmanager");
    }
});