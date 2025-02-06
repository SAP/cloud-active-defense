const sequelize = require("../config/db.config");
const Decoy = require("./Decoy-data");
const ProtectedApp = require("./ProtectedApp");
const Config = require("./Config-data");
const Logs = require("./Logs");

async function initializeDatabase() {
  await sequelize.sync();

  try {
    await sequelize.authenticate();
    console.log("Database connected successfully.");
  } catch (error) {
    console.error("Unable to connect to the database...\n", error);
    throw error;
  }
}

Decoy.belongsTo(ProtectedApp, {foreignKey: 'pa_id', as: 'protectedApps'});
ProtectedApp.hasMany(Decoy, {foreignKey: 'pa_id', as: 'decoys' });

Config.belongsTo(ProtectedApp, {foreignKey: 'pa_id', as: 'protectedApps'});
ProtectedApp.hasMany(Config, {foreignKey: 'pa_id', as: 'configs' });

Logs.belongsTo(ProtectedApp, {foreignKey: 'pa_id', as: 'protectedApps'});
ProtectedApp.hasMany(Logs, {foreignKey: 'pa_id', as: 'logs' });

module.exports = { sequelize, initializeDatabase };