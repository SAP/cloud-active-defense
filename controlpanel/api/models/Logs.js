const { DataTypes } = require("sequelize")
const sequelize = require("../config/db.config");

const Logs = sequelize.define("logs", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    date: {
        type: DataTypes.INTEGER,
        defaultValue: Math.floor(new Date().getTime() / 1000),
        allowNull: false
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false
    },
    content: {
        type: DataTypes.JSON,
        allowNull: false
    }
});
module.exports = Logs;