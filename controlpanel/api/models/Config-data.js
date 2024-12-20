const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");
const ProtectedApp = require("./ProtectedApp");

const Config = sequelize.define("config", {
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
    deployed: {
        type: DataTypes.BOOLEAN,
        allowNull: false
    },
    config: {
        type: DataTypes.JSON,
        allowNull: false
    }
});
module.exports = Config;