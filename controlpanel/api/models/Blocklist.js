const { DataTypes } = require("sequelize")
const sequelize = require("../config/db.config");
const ProtectedApp = require("./ProtectedApp");

const Blocklist = sequelize.define("blocklist", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    pa_id: {
        type: DataTypes.UUID,
        references: {
            model: ProtectedApp,
            key: 'id'
        },
        allowNull: false
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false
    },
    date: {
        type: DataTypes.FLOAT,
        defaultValue: Math.floor(new Date().getTime() / 1000),
        allowNull: false
    },
    content: {
        type: DataTypes.JSONB,
        allowNull: false
    }
});
module.exports = Blocklist;