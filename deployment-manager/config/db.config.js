const { Sequelize } = require("sequelize");

const sequelize = new Sequelize('cad', 'deployment_manager', process.env.DEPLOYMENT_MANAGER_PASSWORD, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "postgres",
    logging: false
});

module.exports= sequelize;