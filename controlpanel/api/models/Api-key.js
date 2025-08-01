const { DataTypes } = require("sequelize")
const sequelize = require("../config/db.config");
const ProtectedApp = require("./ProtectedApp");

const ApiKey = sequelize.define("apiKey", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    key: {
        type: DataTypes.STRING,
        allowNull: false
    },
    permissions: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false
    },
    pa_id: {
        type: DataTypes.UUID,
        references: {
            model: ProtectedApp,
            key: 'id'
        },
    },
    expirationDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
    }
});
module.exports = ApiKey;