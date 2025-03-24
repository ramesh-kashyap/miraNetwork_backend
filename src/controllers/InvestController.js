const { User, Investment, WalletModel } = require("../models"); // Import User model
const nodemailer = require("nodemailer");
const { Op } = require('sequelize');
const { ethers } = require("ethers");
const {TronWeb} = require("tronweb");
const axios = require("axios");



const getHistory = async (req, res) => {
    try {
        const user = req.user;
        // console.log("Authenticated User:", user);

        if (!user || !user.id) {
            return res.status(400).json({ error: "User not authenticated" });
        }   
        const userId = user.id;
    
        const investmentHistory = await Investment.findAll({
            where: { user_id: userId, status:'Active'},
            order: [['created_at', 'DESC']] // Order by created_at in descending order
        });
        res.json({ success: true, data: investmentHistory });
    } catch (error) {
        console.error("Error fetching investment history:", error.message, error.stack);
        res.status(500).json({ error: error.message });
    }
};

const generateWallet = async (req, res) => {
    try {
        const user = req.user;
        const {blockchain} = req.body;
        // console.log("Authenticated User:", user);
        if (!user || !user.id) {
            return res.status(400).json({ error: "User not authenticated" });
        }   
        let wallet = await WalletModel.findOne({ where: { blockchain, user_id: user.id} });
    
        if (!wallet) {
            if (blockchain === "BSC") {
                const newWallet = ethers.Wallet.createRandom();
                wallet = await WalletModel.create({
                    blockchain,
                    user_id: user.id,
                    wallet_address: newWallet.address,
                    private_key: newWallet.privateKey
                });
            } else if (blockchain === "TRON") {
                const newWallet = await tronWeb.createAccount();
                wallet = await WalletModel.create({
                    blockchain,
                    user_id: user.id,
                    wallet_address: newWallet.address.base58,
                    private_key: newWallet.privateKey
                });
            }
        }
     res.json({ message: "Wallet Assigned", wallet: wallet.wallet_address,blockchain:blockchain,status:true});
    } catch (error) {
        console.error("Error fetching investment history:", error.message, error.stack);
        res.status(500).json({ error: error.message,status:false });
    }
};




// Confirm Deposit Function
const confirmDeposit = async (req, res) => {
    try {
      
      const user = req.user; // Authenticated user
      if (!user.email) {
        return res.status(400).json({ error: "Bind your email first from settings" });
      }
  
      const { amount, method } = req.body;
      const amountTotal = amount;
  
      // Determine Payment Mode
      let paymentMode = method === "USDT BEP20" ? "USDT_BSC" : "USDT_TRX";
  
      // Generate invoice number
      const invoice = Math.floor(1000000 + Math.random() * 9000000).toString();
  
      // Plisio API Request
      const apiURL = "https://plisio.net/api/v1/invoices/new";
      const postInput = {
        source_currency: "USD",
        source_amount: amountTotal,
        order_number: invoice,
        currency: paymentMode,
        email: user.email,
        order_name: user.username,
        callback_url: "https://nestnft.io/dynamicupicallback?json=true",
        api_key: "YXDYt0S3tamXFWzd7ZHQQK6GSctWmrXYQFP7wdy4yoNJeGWeGtVWnNqB1phmHytP",
      };
  
      const response = await axios.get(apiURL, { params: postInput });
      if (response.data.status === "success") {
        const resultData = response.data.data;
        const now = new Date();

        // Insert into database using Sequelize
        await Investment.create({
          plan: 1,
          orderId: invoice,
          transaction_id: resultData.txn_id,
          user_id: user.id,
          user_id_fk: user.username,
          amount: amountTotal,
          payment_mode: paymentMode,
          status: "Pending",
          sdate: now,
          active_from: user.username,
          created_at:now,
        });
  
        // Return data for frontend
        
        return res.status(200).json({ success:true,
          walletAddress: resultData.wallet_hash,
          paymentMode,
          transaction_id: resultData.txn_id,
          qr_code: resultData.qr_code,
          orderId: invoice,
          amount: amountTotal,
          invoice_total_sum: resultData.invoice_total_sum,
        });
      } else {
        return res.status(400).json({ error: response.data });
      }
    } catch (error) {

      return res.status(500).json({success:false, error: "Internal server error", details: error.message });
    }
  };
  


module.exports = { getHistory,generateWallet,confirmDeposit};
