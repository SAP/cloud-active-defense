const { DataTypes } = require("sequelize")
const sequelize = require("../config/db.config");

const Logs = sequelize.define("logs", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    date: {
        type: DataTypes.FLOAT,
        defaultValue: Math.floor(new Date().getTime() / 1000),
        allowNull: false
    },
    pa_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false
    },
    content: {
        type: DataTypes.JSONB,
        allowNull: false
    }
});
module.exports = Logs;