const sequelize = require("../config/db.config");

async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log("Database connected successfully.");
  } catch (error) {
    console.error("Unable to connect to the database...\n", error);
    throw error;
  }
}

module.exports = { sequelize, initializeDatabase };