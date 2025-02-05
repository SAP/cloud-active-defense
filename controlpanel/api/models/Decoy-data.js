const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");
const ProtectedApp = require("./ProtectedApp");

const Decoy = sequelize.define("decoy", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    state: {
        type: DataTypes.STRING,
        allowNull: false
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
    decoy: {
        type: DataTypes.JSON,
        allowNull: false
    }
});
module.exports = Decoy;