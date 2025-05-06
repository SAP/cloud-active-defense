const express = require('express');
const cors = require('cors');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
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

const swaggerDefinition = {
    openapi: '3.1.0',
    info: {
        title: 'ControlPanel API',
        version: '1.0.0',
        description: 'API documentation for the ControlPanel',
    },
    servers: [
        {
            url: 'controlpanel-api',
        },
    ],
    components: {
        schemas: {
            ProtectedApp: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        format: 'uuid',
                        example: '928b9fa6-a36d-4063-b104-8380d0b08e90',
                    },
                    namespace: {
                        type: 'string',
                        example: 'demo-ns',
                    },
                    application: {
                        type: 'string',
                        example: 'myapp',
                    },
                    createdAt: {
                        type: 'string',
                        format: 'date-time',
                        example: '2023-10-01T12:00:00.000Z',
                    },
                    updatedAt: {
                        type: 'string',
                        format: 'date-time',
                        example: '2023-10-01T12:00:00.000Z',
                    },
                }
            },
            DecoyData: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        format: 'uuid',
                        example: '928b9fa6-a36d-4063-b104-8380d0b08e90',
                    },
                    pa_id: {
                        type: 'string',
                        format: 'uuid',
                        example: '928b9fa6-a36d-4063-b104-8380d0b08e90',
                    },
                    decoy: {
                        $ref: '#/components/schemas/Decoy',
                    },
                    createdAt: {
                        type: 'string',
                        format: 'date-time',
                        example: '2023-10-01T12:00:00.000Z',
                    },
                    updatedAt: {
                        type: 'string',
                        format: 'date-time',
                        example: '2023-10-01T12:00:00.000Z',
                    },
                }
            },
            Decoy: {
                type: 'object',
                properties: {
                    decoy: {
                        type: 'object',
                        properties: {
                            key: {
                                type: 'string',
                                example: 'x-cloud-active-defense',
                            },
                            dynamicKey: {
                                type: 'string',
                                format: 'regex',
                                example: '/^x-cloud/'
                            },
                            separator: {
                                type: 'string',
                                example: '=',
                            },
                            value: {
                                type: 'string',
                                example: 'ACTIVE',
                            },
                            dynamicValue: {
                                type: 'string',
                                format: 'regex',
                                example: '/^ACTIVE/'
                            },
                            string: {
                                type: 'string',
                                example: '<input type="hidden" name="server" value="PROD02">',
                            },
                        }
                    },
                    inject: {
                        type: 'object',
                        properties: {
                            store: {
                                type: 'object',
                                properties: {
                                    inResponse: {
                                        type: 'string',
                                        format: 'regex',
                                        example: '.*',
                                    },
                                    inRequest: {
                                        type: 'string',
                                        format: 'regex',
                                        example: '.*',
                                    },
                                    withVerb: {
                                        type: 'string',
                                        enum: ['', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
                                        example: 'GET',
                                    },
                                    as: {
                                        type: 'string',
                                        enum: ['header', 'cookie', 'body'],
                                        example: 'header',
                                    },
                                    at: {
                                        type: 'object',
                                        properties: {
                                            method: {
                                                type: 'string',
                                                enum: ['line', 'character', 'replace', 'always', 'before', 'after', ],
                                                example: 'line',
                                            },
                                            property: {
                                                oneOf: [
                                                    {
                                                        type: 'integer',
                                                        example: 1,
                                                    },
                                                    {
                                                        type: 'string',
                                                        format: 'regex',
                                                        example: '<h1>Hello World</h1>',
                                                    }
                                                ]
                                            },
                                        }
                                    }
                                }
                            },
                            whenTrue: {
                                type: 'object',
                                properties: {
                                    key: {
                                        type: 'string',
                                        format: 'regex',
                                        example: 'SESSION',
                                    },
                                    value: {
                                        type: 'string',
                                        format: 'regex',
                                        example: '.*',
                                    },
                                    in: {
                                        type: 'string',
                                        enum: ['header', 'cookie', 'url', 'getParam', 'postParam', 'payload'],
                                        example: 'cookie',
                                    }
                                }
                            },
                            whenFalse: {
                                type: 'object',
                                properties: {
                                    key: {
                                        type: 'string',
                                        format: 'regex',
                                        example: 'SESSION',
                                    },
                                    value: {
                                        type: 'string',
                                        format: 'regex',
                                        example: '.*',
                                    },
                                    in: {
                                        type: 'string',
                                        enum: ['header', 'cookie', 'url', 'getParam', 'postParam', 'payload'],
                                        example: 'cookie',
                                    }
                                }
                            }
                        }
                    },
                    detect: {
                        type: 'object',
                        properties: {
                            seek: {
                                type: 'object',
                                properties: {
                                    inRequest: {
                                        type: 'string',
                                        format: 'regex',
                                        example: '.*',
                                    },
                                    inResponse: {
                                        type: 'string',
                                        format: 'regex',
                                        example: '.*',
                                    },
                                    withVerb: {
                                        type: 'string',
                                        enum: ['', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
                                        example: 'GET',
                                    },
                                    in: {
                                        type: 'string',
                                        enum: ['header', 'cookie', 'url', 'getParam', 'postParam', 'payload'],
                                        example: 'cookie',
                                    }
                                }
                            },
                            alert: {
                                type: 'object',
                                properties: {
                                    severity: {
                                        type: 'string',
                                        enum: ['HIGH', 'MEDIUM', 'LOW'],
                                        example: 'HIGH',
                                    },
                                    whenSeen: {
                                        type: 'boolean',
                                        example: true,
                                    },
                                    whenComplete: {
                                        type: 'boolean',
                                        example: false,
                                    },
                                    whenModified: {
                                        type: 'boolean',
                                        example: false,
                                    },
                                    whenAbsent: {
                                        type: 'boolean',
                                        example: true,
                                    },
                                }
                            },
                            respond: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        source: {
                                            type: 'string',
                                            enum: ['ip', 'userAgent', 'session'],
                                            example: 'ip',
                                        },
                                        behavior: {
                                            type: 'string',
                                            enum: ['drop', 'error', 'divert', 'throttle'],
                                            example: 'drop',
                                        },
                                        delay: {
                                            type: 'string',
                                            format: 'regex',
                                            example: '10s',
                                        },
                                        duration: {
                                            type: 'string',
                                            example: 'forever',
                                        },
                                        property: {
                                            type: 'integer',
                                            example: 10,
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            ConfigData: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        format: 'uuid',
                        example: '928b9fa6-a36d-4063-b104-8380d0b08e90',
                    },
                    pa_id: {
                        type: 'string',
                        format: 'uuid',
                        example: '928b9fa6-a36d-4063-b104-8380d0b08e90',
                    },
                    deployed: {
                        type: 'boolean',
                        example: true,
                    },
                    config: {
                        $ref: '#/components/schemas/Config',
                    },
                    createdAt: {
                        type: 'string',
                        format: 'date-time',
                        example: '2023-10-01T12:00:00.000Z',
                    },
                    updatedAt: {
                        type: 'string',
                        format: 'date-time',
                        example: '2023-10-01T12:00:00.000Z',
                    },
                }
            },
            Config: {
                type: 'object',
                properties: {
                    session: {
                        type: 'object',
                        properties: {
                            key: {
                                type: 'string',
                                format: 'regex',
                                example: 'SESSION',
                            },
                            in: {
                                type: 'string',
                                enum: ['header', 'cookie'],
                                example: 'cookie',
                            }
                        }
                    },
                    username: {
                        type: 'object',
                        properties: {
                            key: {
                                type: 'string',
                                format: 'regex',
                                example: 'username',
                            },
                            value: {
                                type: 'string',
                                format: 'regex',
                                example: '.*',
                            },
                            in: {
                                type: 'string',
                                enum: ['header', 'cookie', 'payload'],
                                example: 'cookie',
                            }
                        }
                    },
                    server: {
                        type: 'string',
                        example: 'PROD02',
                    },
                    blocklistReload: {
                        type: 'integer',
                        example: '10',
                    },
                    respond: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                source: {
                                    type: 'string',
                                    enum: ['ip', 'userAgent', 'session'],
                                    example: 'ip',
                                },
                                behavior: {
                                    type: 'string',
                                    enum: ['drop', 'error', 'divert', 'throttle'],
                                    example: 'drop',
                                },
                                delay: {
                                    type: 'string',
                                    format: 'regex',
                                    example: '10s',
                                },
                                duration: {
                                    type: 'string',
                                    example: 'forever',
                                },
                                property: {
                                    type: 'integer',
                                    example: 10,
                                }
                            }
                        }
                    }
                }
            },
            BlocklistData: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        format: 'uuid',
                        example: '928b9fa6-a36d-4063-b104-8380d0b08e90',
                    },
                    pa_id: {
                        type: 'string',
                        format: 'uuid',
                        example: '928b9fa6-a36d-4063-b104-8380d0b08e90',
                    },
                    type: {
                        type: 'string',
                        enum: ['blocklist', 'throttle'],
                        example: 'blocklist',
                    },
                    date: {
                        type: 'integer',
                        format: 'timestamp',
                        example: 1696156800,
                    },
                    content: {
                        $ref: '#/components/schemas/Blocklist',
                    }
                }
            },
            Blocklist: {
                type: 'object',
                properties: {
                    Time: {
                        type: 'integer',
                        format: 'timestamp',
                        example: 1696156800,
                    },
                    RequestID: {
                        type: 'string',
                        format: 'uuid',
                        example: '928b9fa6-a36d-4063-b104-8380d0b08e90',
                    },
                    Behavior: {
                        type: 'string',
                        enum: ['drop', 'error', 'divert', 'throttle'],
                        example: 'drop',
                    },
                    Delay: {
                        type: 'string',
                        format: 'regex',
                        example: '10s',
                    },
                    Duration: {
                        type: 'string',
                        example: 'forever',
                    },
                    SourceIP: {
                        type: 'string',
                        format: 'ipv4',
                        example: '127.0.0.1',
                    },
                    UserAgent: {
                        type: 'string',
                        example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
                    },
                    Session: {
                        type: 'string',
                        format: 'uuid',
                        example: '928b9fa6-a36d-4063-b104-8380d0b08e90',
                    }
                }
            },
            Logs: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        format: 'uuid',
                        example: '928b9fa6-a36d-4063-b104-8380d0b08e90',
                    },
                    date: {
                        type: 'integer',
                        format: 'timestamp',
                        example: 1696156800,
                    },
                    pa_id: {
                        type: 'string',
                        format: 'uuid',
                        example: '928b9fa6-a36d-4063-b104-8380d0b08e90',
                    },
                    type: {
                        type: 'string',
                        enum: ['alert', 'event', 'system', 'debug'],
                        example: 'system',
                    },
                    content: {
                        type: 'string',
                        example: 'Read new config',
                    },
                    createdAt: {
                        type: 'string',
                        format: 'date-time',
                        example: '2023-10-01T12:00:00.000Z',
                    },
                    updatedAt: {
                        type: 'string',
                        format: 'date-time',
                        example: '2023-10-01T12:00:00.000Z',
                    },
                }
            }
        }
    }
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

app.listen(8050, async () => {
    try {
        console.log("Control panel API started on port 8050 !");
        await initializeDatabase();
        const defaultApp = await createProtectedApp({ namespace: 'default', application: 'default' }); 
        if (defaultApp.type == 'success') {
            createDecoy({ pa_id: defaultApp.data.id, decoy:{decoy:{key:"x-cloud-active-defense",separator:"=",value:"ACTIVE"},inject:{store:{inResponse:".*",as:"header"}}}});
            updateConfig({ pa_id:defaultApp.data.id, deployed: true, config:{alert:{session:{in:"cookie",key:"SESSION"}}}});
        }
    } catch(e) {
        console.error("Error when starting server:\n", e);
    }
});