const { DataTypes } = require("sequelize");
const sequelize = require("../config/connectDB"); // Import your Sequelize instance

const Lautery = sequelize.define("Lautery", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true, // Add auto-increment if needed
  },
  gudie_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  logo: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  amount: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  bet_amount: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  tableName: "lautry", // Explicitly define the table name
  timestamps: false,  // Disable createdAt & updatedAt columns
});


module.exports = Lautery;