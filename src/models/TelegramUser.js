const { DataTypes } = require("sequelize");
const sequelize = require("../config/connectDB");

const TelegramUser = sequelize.define("TelegramUser", {
    telegram_id: { type: DataTypes.STRING, allowNull: false, unique: true },
    tusername: { type: DataTypes.STRING, allowNull: true }, // Stores last trade timestamp
    tname: { type: DataTypes.STRING, allowNull: true }, // Stores last trade timestamp
    tlastname: { type: DataTypes.STRING, allowNull: true }, // Stores last trade timestamp
    balance: { type: DataTypes.FLOAT, allowNull: true }, // Stores last trade timestamp
    tabbalance: { type: DataTypes.INTEGER, allowNull: true }, // Stores last trade timestamp
    invite_bonus: {type: DataTypes.FLOAT, allowNull: false,},// Stores last trade timestam
    
    
}, {
    tableName: "telegram_users",
    timestamps: false,
});

module.exports = TelegramUser;