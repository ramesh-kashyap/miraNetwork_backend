const { DataTypes } = require("sequelize");
const sequelize = require("../config/connectDB"); // Import your Sequelize instance

const Lautrygift = sequelize.define("Lautrygift", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true, // Add auto-increment if needed
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  gift_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  gift_amount: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  usdt: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  tableName: "lautry_gift", // Explicitly define the table name
  timestamps: false,  // Disable createdAt & updatedAt columns
});


module.exports = Lautrygift;