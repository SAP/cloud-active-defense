const express = require('express');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config({ path: __dirname + '/.env' });

const { initializeDatabase } = require('./model')

const envoy = require('./routes/envoy');
const telemetry = require('./routes/telemetry');
const resources = require('./routes/resources');

const app = express();
app.use(express.json());

app.use('/envoy', envoy);
app.use('/telemetry', telemetry);
app.use('/resources', resources);

const swaggerDefinition = {
    openapi: '3.1.0',
    info: {
        title: 'Deployment manager API',
        version: '1.0.0',
        description: 'API documentation for the Deployment manager',
    },
    servers: [
        {
            url: 'deployment-manager',
        },
    ]
};
const options = {
    swaggerDefinition,
    apis: ['./routes/*.js'],
}
const swaggerSpec = swaggerJsDoc(options);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ type: 'error', code: 400, message: "The provided json is invalid", data: err });
    }
    next();
});

app.listen(3000, async () => {
    try {
        await initializeDatabase();
        console.log("Deployment manager started on port 3000!");
    } catch(e) {
        console.error("Error when starting server:\n", e);
    }
});