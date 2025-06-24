const Keycloak = require('keycloak-connect');
require('dotenv').config({ path: __dirname + '/.env' });

const keycloak = new Keycloak({}, {
  "realm": "cad",
  "bearer-only": true,
  "auth-server-url": process.env.KEYCLOAK_URL,
  "ssl-required": "external",
  "resource": "cad"
});

module.exports = keycloak;