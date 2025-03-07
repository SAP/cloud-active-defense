const { DataTypes } = require("sequelize")
const sequelize = require("../config/db.config");

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
    }
});
module.exports = ApiKey;