const express = require('express');

const authenticate = require('./middleware/kubeconfig-authentication');

const envoy = require('./routes/envoy');
const telemetry = require('./routes/telemetry');

const app = express();
app.use(express.json());

app.use('/envoy', authenticate, envoy);
app.use('/telemetry', authenticate, telemetry);

app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ type: 'error', code: 400, message: "The provided json is invalid", data: err });
    }
    next();
});

app.listen(3000, async () => {
    try {
        console.log("Deployment manager started on port 3000!");
    } catch(e) {
        console.error("Error when starting server:\n", e);
    }
});