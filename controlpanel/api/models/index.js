const sequelize = require("../config/db.config");
const Decoy = require("./Decoy-data");
const ProtectedApp = require("./ProtectedApp");

sequelize.sync();

try {
  sequelize.authenticate();
} catch (error) {
  console.error("Unable to connect to the database...\n", error);
}

Decoy.belongsTo(ProtectedApp, {foreignKey: 'pa_id', as: 'protectedApp'});
ProtectedApp.hasMany(Decoy, {foreignKey: 'pa_id', as: 'decoys' })

module.exports = sequelize;