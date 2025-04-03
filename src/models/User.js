const { DataTypes } = require('sequelize');
const sequelize = require('../config/connectDB');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    telegram_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    tusername: { type: DataTypes.STRING, allowNull: true }, // Stores last trade timestamp
    tname: { type: DataTypes.STRING, allowNull: true }, // Stores last trade timestamp
    tlastname: { type: DataTypes.STRING, allowNull: true }, // Stores last trade timestamp
    balance: { type: DataTypes.FLOAT, allowNull: true }, // Stores last trade timestamp
    tabbalance: { type: DataTypes.FLOAT, allowNull: true },
    meme_coin: { type: DataTypes.FLOAT, allowNull: true },
    meme_date: {
        type: DataTypes.DATE, // Change from STRING to DATE
        allowNull: true,
    },
    hour_bal: { type: DataTypes.FLOAT, allowNull: true },
    streak_no: {type: DataTypes.INTEGER, allowNull: true},
    streak: { type: DataTypes.INTEGER, allowNull: true },
    streak_date: {
        type: DataTypes.DATE, // Change from STRING to DATE
        allowNull: true,
    },
    dailyquest: { type: DataTypes.INTEGER, allowNull: true },
    quest_date: {
        type: DataTypes.DATE, // Change from STRING to DATE
        allowNull: true,
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true, // Ensure unique usernames
    },
    sponsor: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 1,
    },
    active_status: {
        type: DataTypes.ENUM('Active', 'Inactive', 'Pending'), // Fixed ENUM options
        defaultValue: 'Pending', // Set default properly
        allowNull: false
    },
    jdate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW, // Automatically set date
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true, // Ensure unique emails
        validate: {
            isEmail: true, // Ensure valid email format
        }
    },
    google_id: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true // Ensure Google ID is unique
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    userbalance: {
        type: DataTypes.FLOAT,
        allowNull: true,
    },

    
    password: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    usdtTrc20: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    usdtBep20: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    PSR: {
        type: DataTypes.STRING,
        allowNull: true,
    },
  
   
    created_at: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    package: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    PSR: {
        type: DataTypes.INTEGER,
        allowNull: true
    },

    phone: {
        type: DataTypes.INTEGER,
        allowNull: true
    },

    country: {
        type: DataTypes.STRING,
        allowNull: true
      },
    TPSR: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    level: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    tpassword: {
        type: DataTypes.STRING,
        allowNull: true
    },
    is_verify: {
        type: DataTypes.INET,
        allowNull: true
    },
    ParentId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    detail_changed_date: {
        type: DataTypes.DATE,
        allowNull: true
    },
    adate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    telegram_id: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true, // Ensuring telegram_id is unique
    },
    phone: DataTypes.STRING,

    
  
}, {
    tableName: 'users',
    timestamps: false, // Enable createdAt and updatedAt fields
});




module.exports = User;