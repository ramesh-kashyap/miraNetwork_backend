const sequelize = require('../config/connectDB'); // Import Sequelize connection
const { QueryTypes } = require('sequelize');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const express = require('express');
const { log } = require('winston');
// const bodyParser = require('body-parser')




// Register User Function

const register = async (req, res) => {
    const t = await sequelize.transaction(); // Start a transaction

    try {
        const { fullName, email, phone,password, repeatPassword, referralCode , country} = req.body;

        // Validate required fields
        if (!fullName || !email || !password || !phone || !repeatPassword) {
            return res.status(200).json({
                message: "All2 fields are required!",
                status: false
            });
        }

        // Check if passwords match
        if (password !== repeatPassword) {
            return res.status(200).json({
                message: "Passwords do not match!",
                status: false
            });
        }


        const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;

if (!strongPassword.test(password)) {
  return res.status(200).json({
    message: "Password must be at least 6 characters long and include at least 1 uppercase letter, 1 lowercase letter, and 1 number.",
    status: false
  });
}

        // Check if user already exists
        const existingUser = await User.findOne({ where: { email }, transaction: t });
        if (existingUser) {
            return res.status(200).json({
                message: "Email already registered!",
                status: false
            });
        }

        // Validate referralCode exists as a username and is active
        let sponsorId = null;
        let sponsorLevel = 0;

        if (referralCode) {
            const referrer = await User.findOne({
                where: { username: referralCode, active_status: "Active" },
                transaction: t
            });

            if (!referrer) {
                return res.status(200).json({
                    message: "Invalid referral code! No active user found with this username.",
                    status: false
                });
            }

            sponsorId = referrer.id;
            sponsorLevel = referrer.level + 1;
        }

        // Generate Random Username & Temporary Password
        const username = Math.floor(10000000 + Math.random() * 90000000).toString();
        const tpassword = Math.random().toString(36).substring(2, 8);

        // Hash passwords
        const hashedPassword = await bcrypt.hash(password, 10);
        const hashedTPassword = await bcrypt.hash(tpassword, 10);

        // Get Parent ID (Last Registered User)
        const lastUser = await User.findOne({ order: [['id', 'DESC']], transaction: t });
        const parentId = lastUser ? lastUser.id : null;

        // Create New User
        const newUser = await User.create({
            name: fullName,
            email: email,
            country: country,
            username,
            phone:phone,
            password: hashedPassword,
            tpassword: hashedTPassword,
            PSR: password,
            TPSR: tpassword,
            sponsor: sponsorId || 1, // Default to 1 if no sponsor is found
            level: sponsorLevel,
            ParentId: parentId
        }, { transaction: t });


// console.log( newUser);

        
        await t.commit();

        // Generate JWT token
        const token = jwt.sign({ id: newUser.id, email: newUser.email }, process.env.JWT_SECRET, { expiresIn: "1h" });

        return res.status(201).json({
            message: "Registration successful!",
            status: true,
            token
        });

    } catch (error) {
        await t.rollback(); // Rollback transaction on error
        console.error("Error:", error.message);
        return res.status(500).json({
            message: "Server error",
            status: false,
            details: error.message
        });
    }
};



const GetchangePassword = async (req, res) => {
    try {
      const { old_password, password, password_confirmation } = req.body;

      // 1. Validate fields
      if (!old_password || !password || !password_confirmation) {
        return res.status(400).json({ error: "All fields are required" });
      }

      if (password !== password_confirmation) {
        return res.status(400).json({ error: "Passwords must match" });
      }

      // 2. Get logged-in user from token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // 3. Check if user has a password
      if (!user.password) {
        return res.status(400).json({ error: "User password not found" });
      }

      // 4. Check current password
      const isMatch = await bcrypt.compare(old_password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }

      // 5. Hash and update new password
      const hashedPassword = await bcrypt.hash(password, 10);
      await user.update({
        password: hashedPassword,
        updatedAt: new Date()
      });

      return res.json({ message: "Password updated successfully" });

    } catch (err) {
      console.error("Change password error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
};


const register2 = async (req, res) => {
    try {
        const { name, phone, email, password, sponsor } = req.body;
        
        if (!name || !phone || !email || !password || !sponsor) {
            return res.status(400).json({ error: "All fields are required!" });
        }

        // Check if user already exists
        const [existingUser] = await db.execute(
            "SELECT * FROM users WHERE email = ? OR phone = ?", [email, phone]
        );
        
        if (existingUser.length > 0) {
            return res.status(400).json({ error: "Email or Phone already exists!" });
        }

        // Check if sponsor exists
        const [sponsorUser] = await db.execute(
            "SELECT * FROM users WHERE username = ?", [sponsor]
        );
        if (sponsorUser.length === 0) {
            return res.status(400).json({ error: "Sponsor does not exist!" });
        }

        // Generate username & transaction password
        const username = Math.random().toString(36).substring(2, 10);
        const tpassword = Math.random().toString(36).substring(2, 8);

        // Hash passwords
        const hashedPassword = await bcrypt.hash(password, 10);
        const hashedTPassword = await bcrypt.hash(tpassword, 10);

        // Get parent ID
        const [lastUser] = await db.execute("SELECT id FROM users ORDER BY id DESC LIMIT 1");
        const parentId = lastUser.length > 0 ? lastUser[0].id : null;

        // Provide a default for sponsor level if it's undefined or null
        const sponsorLevel = (sponsorUser[0].level !== undefined && sponsorUser[0].level !== null)
            ? sponsorUser[0].level
            : 0;

        // Construct new user object
        const newUser = {
            name,
            phone,
            email,
            username,
            password: hashedPassword,
            tpassword: hashedTPassword,
            PSR: password,
            TPSR: tpassword,
            sponsor: sponsorUser[0].id,
            level: sponsorLevel + 1,  // Default to 0 if sponsor level is not defined, then add 1
            ParentId: parentId
        };

        // Optional: Log newUser for debugging (avoid logging sensitive info in production)
        console.log("New User Data:", newUser);

        // Insert new user into the database
        await db.execute("INSERT INTO users SET ?", newUser);

        return res.status(201).json({ message: "User registered successfully!", username });

    } catch (error) {
        console.error("Error:", error.message);
        return res.status(500).json({ error: "Server error", details: error.message });
    }
};



// Export function



// Login User Function
const login = async (req, res) => {
    try {
      const { email, password } = req.body;
  
      // Validate inputs
      if (!email || !password) {
        return res.status(200).json({
          message: 'Email and Password are required!',
          status: false,
        });
      }
  
      // Find user by email
      const user = await User.findOne({ where: { email } });
  
      if (!user) {
        return res.status(200).json({
          message: 'User not found!',
          status: false,
        });
      }
  
      // Compare password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(200).json({
          message: 'Invalid credentials!',
          status: false,
        });
      }
  
      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
  
      return res.status(200).json({
        message: 'Login successful!',
        status: true,
        username: user.username,
        token,
      });
    } catch (error) {
      console.error("Error:", error.message);
      return res.status(500).json({
        message: "Server error",
        status: false,
      });
    }
  };
  


const logout = async (req, res) => {
    try {
        return res.json({ message: "User logged out successfully!" });
    } catch (error) {
        console.error("Logout Error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};


const loginWithTelegram = async (req, res) => {
    console.log(req.body);
    try {
        const { telegram_id, tusername, tname, tlastname } = req.body;


        if (!telegram_id) {
            return res.status(200).json({ message: "Telegram ID is required" });
        }

        // ✅ Check if user exists
        const queryCheckUser = `
            SELECT * FROM telegram_users WHERE telegram_id = :telegram_id
        `;

        const users = await sequelize.query(queryCheckUser, {
            replacements: { telegram_id },
            type: QueryTypes.SELECT,
        });
        if (users.length > 0) {
            // ✅ User exists, generate JWT token
            const user = users[0]; // Extract first user

            const token = jwt.sign(
                { id: user.id, telegram_id: user.telegram_id },
                process.env.JWT_SECRET
            );

            return res.status(200).json({
                message: "Login successful",
                telegram_id: telegram_id,
                token,
            });
        } else {
            // ✅ Create new user
            const queryInsertUser = `
                INSERT INTO telegram_users (telegram_id, tusername, tname, tlastname) 
                VALUES (:telegram_id, :tusername, :tname, :tlastname)
            `;

            const [insertResult] = await sequelize.query(queryInsertUser, {
                replacements: { telegram_id, tusername, tname, tlastname },
                type: QueryTypes.INSERT,
            });

            // ✅ Generate JWT token for new user
            const token = jwt.sign(
                { id: insertResult, telegram_id }, // insertResult contains the new user ID
                process.env.JWT_SECRET,
                { expiresIn: "1h" }
            );

            return res.status(201).json({
                message: "Account created and logged in",
                telegram_id: telegram_id,
                token,
            });
        }
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};


const getUserProfile = async (req, res) => {
    try {
        

        const user = await User.findOne({
            attributes: ['id', 'name', 'email','telegram_id'],
            where: { id: req.user.id }
        });


        if (!user) {
            return res.status(200).json({ message: "User not found" });
        }

        res.json(user); 
    } catch (error) {
        console.error("Error fetching user:", error.message);
        res.status(200).json({ error: error.message });
    }
};

const updateUserProfile = async (req, res) => {
    try {
        
        const userId = req.user.id; 

        const { name } = req.body; 

        if (!name) {
            return res.status(400).json({ message: "Name is required" });
        }

        // ✅ User ka name update karein
        const [updatedRows] = await User.update({ name }, { where: { id: userId } });

        if (updatedRows === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ message: "Profile updated successfully", name });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};












module.exports = { login, register, logout,loginWithTelegram,getUserProfile,updateUserProfile,GetchangePassword};

