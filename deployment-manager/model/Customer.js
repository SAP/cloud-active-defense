const { DataTypes } = require("sequelize")
const sequelize = require("../config/db.config");

const Customer = sequelize.define("customer", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    kubeconfig: {
        type: DataTypes.TEXT,
        allowNull: true
    },
});
module.exports = Customer;