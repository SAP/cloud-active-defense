const sequelize = require("../config/db.config");
const Decoy = require("./Decoy-data");
const ProtectedApp = require("./ProtectedApp");
const Config = require("./Config-data");
const Logs = require("./Logs");

sequelize.sync();

try {
  sequelize.authenticate();
} catch (error) {
  console.error("Unable to connect to the database...\n", error);
}

Decoy.belongsTo(ProtectedApp, {foreignKey: 'pa_id', as: 'protectedApps'});
ProtectedApp.hasMany(Decoy, {foreignKey: 'pa_id', as: 'decoys' });

Config.belongsTo(ProtectedApp, {foreignKey: 'pa_id', as: 'protectedApps'});
ProtectedApp.hasMany(Config, {foreignKey: 'pa_id', as: 'configs' });

Logs.belongsTo(ProtectedApp, {foreignKey: 'pa_id', as: 'protectedApps'});
ProtectedApp.hasMany(Logs, {foreignKey: 'pa_id', as: 'logs' });

module.exports = sequelize;