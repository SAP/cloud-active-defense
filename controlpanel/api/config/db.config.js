const { Sequelize } = require("sequelize");

const sequelize = new Sequelize('cad', process.env.POSTGRES_USER, process.env.POSTGRES_PASSWORD, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "postgres",
    logging: false
});

module.exports= sequelize;