const { DataTypes } = require("sequelize");
const sequelize = require("../config/connectDB"); // Import your Sequelize instance

const Premium = sequelize.define("Premium", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true, // Add auto-increment if needed
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  pack: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  airo: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  tableName: "premium", // Explicitly define the table name
  timestamps: false,  // Disable createdAt & updatedAt columns
});


module.exports = Premium;