const sequelize = require("../config/db.config");

async function waitForDatabase(maxAttempts = 10, delayMs = 5000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await sequelize.authenticate();
      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      console.warn(`[startup][db] Database not ready (attempt ${attempt}/${maxAttempts}), retrying in ${delayMs}ms... (${error.message})`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function initializeDatabase() {
  await waitForDatabase();
  console.log("Database connected successfully.");
}

module.exports = { sequelize, initializeDatabase };