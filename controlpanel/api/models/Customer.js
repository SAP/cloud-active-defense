const { DataTypes } = require("sequelize")
const sequelize = require("../config/db.config");
const Sequelize = require("sequelize");

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

Customer.getCustomersWithExpiredApiKeys = async () => {
    return await Customer.findAll({
        include: [{
            model: sequelize.models.protectedApp,
            as: 'protectedApps',
            include: [{
                model: sequelize.models.apiKey,
                as: 'apiKeys',
                where: {
                    expirationDate: {
                        [Sequelize.Op.lte]: new Date()
                    }
                },
                required: true
            }]
        }]
    });
};

module.exports = Customer;