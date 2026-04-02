const sequelize = require("../config/db.config");
const { QueryTypes } = require("sequelize");
const Decoy = require("./Decoy-data");
const ProtectedApp = require("./ProtectedApp");
const Config = require("./Config-data");
const Logs = require("./Logs");
const ApiKey = require("./Api-key");
const Customer = require("./Customer");

let dbInitialized = false;

async function waitForDatabase(maxAttempts = 10, delayMs = 5000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await sequelize.authenticate();
      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        console.error(`[startup][db] Could not reach database after ${maxAttempts} attempts`, { message: error.message });
        throw error;
      }
      console.warn(`[startup][db] Database not ready (attempt ${attempt}/${maxAttempts}), retrying in ${delayMs}ms... (${error.message})`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function initializeDatabase() {

  try {
    await waitForDatabase();

    await sequelize.sync();

    const userResult = await sequelize.query(`
      SELECT rolname
      FROM pg_catalog.pg_roles
      WHERE rolname = 'deployment_manager';
    `, { type: QueryTypes.SELECT });
    if (userResult.length == 0) {
      const password = process.env.DEPLOYMENT_MANAGER_PASSWORD || 'deployment_manager';
      await sequelize.query(`
        CREATE USER deployment_manager WITH PASSWORD :password;
        REVOKE ALL ON DATABASE cad FROM deployment_manager;
        GRANT CONNECT ON DATABASE cad TO deployment_manager;
        GRANT SELECT ON TABLE customers TO deployment_manager;
      `, { replacements: { password }});
    }
    dbInitialized = true;
    console.log("Database connected successfully.");
  } catch (error) {
    console.error("Unable to connect to the database...\n", error);
    throw error;
  }
}

function isInitialized() {
  return dbInitialized;
}

Decoy.belongsTo(ProtectedApp, {foreignKey: 'pa_id', as: 'protectedApp', onDelete: 'CASCADE'});
ProtectedApp.hasMany(Decoy, {foreignKey: 'pa_id', as: 'decoys', onDelete: 'CASCADE'});

Config.belongsTo(ProtectedApp, {foreignKey: 'pa_id', as: 'protectedApp', onDelete: 'CASCADE'});
ProtectedApp.hasMany(Config, {foreignKey: 'pa_id', as: 'configs', onDelete: 'CASCADE'});

Logs.belongsTo(ProtectedApp, {foreignKey: 'pa_id', as: 'protectedApp', onDelete: 'CASCADE'});
ProtectedApp.hasMany(Logs, {foreignKey: 'pa_id', as: 'logs', onDelete: 'CASCADE'});

ApiKey.belongsTo(ProtectedApp, {foreignKey: 'pa_id', as: 'protectedApp', onDelete: 'CASCADE'});
ProtectedApp.hasMany(ApiKey, {foreignKey: 'pa_id', as: 'apiKeys', onDelete: 'CASCADE'});

ProtectedApp.belongsTo(Customer, {foreignKey: 'cu_id', as: 'customer' });
Customer.hasMany(ProtectedApp, {foreignKey: 'cu_id', as: 'protectedApps' });

module.exports = { sequelize, initializeDatabase, isInitialized };