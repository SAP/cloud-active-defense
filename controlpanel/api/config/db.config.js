const { Sequelize } = require("sequelize");

const sequelize = new Sequelize('cad', process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "postgres",
    logging: false
});

module.exports= sequelize;