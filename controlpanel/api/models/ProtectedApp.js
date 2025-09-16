const { DataTypes } = require("sequelize")
const sequelize = require("../config/db.config");
const Customer = require("./Customer");

const ProtectedApp = sequelize.define("protectedApp", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    namespace: {
        type: DataTypes.STRING,
        allowNull: false
    },
    application: {
        type: DataTypes.STRING,
        allowNull: false
    },
    cu_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: Customer,
            key: 'id'
        },
    },
    lastConfigTime: {
        type: DataTypes.BIGINT,
        allowNull: true,
        defaultValue: Date.now()
    }
});
module.exports = ProtectedApp;