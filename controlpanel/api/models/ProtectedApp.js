const { DataTypes } = require("sequelize")
const sequelize = require("../config/db.config");

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
});
module.exports = ProtectedApp;