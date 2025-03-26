const { Console } = require('winston/lib/winston/transports');
const sequelize = require('../config/connectDB'); // Import Sequelize connection
const { QueryTypes,Op } = require('sequelize');
const TelegramUser = require("../models/TelegramUser");
const jwt = require("jsonwebtoken");
// const { TelegramUser } = require("../models");
const { User,Income,Transaction,UserTask} = require("../models"); // Adjust path as needed
const Task = require("../models/Task");
const moment = require("moment-timezone");
const { getVip,getBalance,getPercentage } = require("../services/userService");
const { log } = require('winston');

let timeNow = Date.now();

const getUserByTelegramId = async (req, res) => {
    try {
        const { telegram_id } = req.user;
        console.log(req.user?.telegram_id);
        const tid = req.user?.telegram_id
        if (!telegram_id) {
            return res.status(200).json({
                message: "Telegram ID is required",
                status: false,
                timeStamp: timeNow,
            });
        }
        const user = await TelegramUser.findOne({where:{telegram_id: tid}}) 
        if(!user){
            return res.status(200).json(message, "user not found");
        }
        return res.status(200).json({
            user: results[0],
            status: true,
            timeStamp: timeNow
        });

    } catch (error) {
        console.error("Error fetching user:", error);
        return res.status(500).json({
            message: "Internal Server Error",
            status: false,
            timeStamp: timeNow,
        });
    }
};





const getTelegramHistory = async (req, res) => {
    try {
        // लॉगिन किए हुए यूज़र की ID लें
        const user = req.user;

        if (!user) {
            return res.status(401).json({
                message: "Unauthorized: User not logged in",
                status: false,
                // timeStamp: new Date(),
            });
        }

        // यूज़र टेबल से telegram_id प्राप्त करें और telegram_users टेबल में उसी telegram_id से match करें
        const telegramUsers = await TelegramUser.findAll({ where: { id: user.telegram_id } });
       

        // अगर कोई डेटा नहीं मिला तो 404 रेस्पॉन्स भेजें
        if (telegramUsers.length === 0) {
            return res.status(404).json({
                message: "No matching telegram users found for the logged-in user",
                status: false,
                timeStamp: new Date(),
            });
        }

        // सफल डेटा रेस्पॉन्स
        res.json({ success: true, data: telegramUsers });
    } catch (error) {
        console.error("Error fetching telegram users:", error.message, error.stack);
        res.status(500).json({ error: error.message });
    }
};

const startTrade = async (req, res) => {
    try {
        const { telegram_id } = req.body;
        if (!telegram_id) {
            return res.status(400).json({ success: false, message: "Telegram ID is required" });
        }

        const query = `
            SELECT 
                tu.telegram_id, tu.tusername, tu.tname, tu.tlastname,
                u.id AS user_id, u.email, u.name, u.username
            FROM telegram_users tu
            LEFT JOIN users u ON tu.id = u.telegram_id
            WHERE tu.telegram_id = :telegram_id;`;

        const results = await sequelize.query(query, {
            replacements: { telegram_id },
            type: QueryTypes.SELECT
        });

        if (!results.length || !results[0].user_id) {
            return res.status(404).json({
                message: "User not found",
                status: false,
                timeStamp: moment().tz("Asia/Kolkata").format(), // ✅ IST Timestamp
            });
        }

        let userId = results[0].user_id;
        const userBalance = await getBalance(userId);
        if (userBalance<50) 
            {
            return res.status(404).json({ success: false, message: "Insufficient Balance" });
            }
        
        const vipLevel = await getVip(userId);
        const percentage = await getPercentage(vipLevel);
     
        const rewardPerDay = (userBalance * percentage) / 100;

        // ✅ Set lastTrade to current IST time + 24 hours

        // const lastTradeUTC = moment().utc().add(24, "hours").format("YYYY-MM-DD HH:mm:ss");
        const now = new Date();
        const lastTradeUTC = new Date(now.setHours(now.getHours() + 24));


        // ✅ Store in UTC format but based on IST calculations

        // Update or create lastTrade for the user
        const [user, created] = await TelegramUser.findOrCreate({
            where: { telegram_id },
            defaults: { lastTrade: lastTradeUTC, total_reward: rewardPerDay },
        });

        if (!created) {
            await user.update({ lastTrade: lastTradeUTC, total_reward: rewardPerDay });
        }

        return res.json({
            success: true,
            lastTrade: lastTradeUTC, // ✅ Stored in UTC, calculated from IST
            depositAmount: userBalance,
            rewardPerDay: rewardPerDay,
        });

    } catch (error) {
        console.error("Error updating lastTrade:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

function calculatePoints(timeLeft, rewardPerDay) {
    const intervalSeconds = 5; // Reward every 5 seconds
    const totalIntervals = 86400 / intervalSeconds; // Total intervals in 24 hours
    const rewardPerInterval = rewardPerDay / totalIntervals; // Points per 5 seconds

    const elapsedIntervals = (86400 - timeLeft) / intervalSeconds; // How many intervals have passed
    const newPoints = elapsedIntervals * rewardPerInterval; // Total earned points

    return parseFloat(newPoints.toFixed(4)); // Round to 4 decimals
}


// API to get lastTrade time for a user
const getLastTrade = async (req, res) => {
    try {
        const { telegram_id } = req.body;
        if (!telegram_id) {
            return res.status(400).json({ success: false, message: "Telegram ID is required" });
        }

        // Fetch lastTrade time from the database
        const user = await TelegramUser.findOne({ where: { telegram_id } });

        if (!user || !user.lastTrade) {
            return res.json({ success: false, message: "No lastTrade time found" });
        }
        const lastTrade = user.lastTrade;
        const todayroi = user.todayroi || 0;
    
        const now = new Date();
        const lastTradeTime = new Date(lastTrade);
        const timeLeft = Math.max((lastTradeTime - now) / 1000, 0); // Remaining time in seconds
        const lastUpdated =  user.lastUpdated;
            // Example Usage:
        return res.json({ success: true, lastTrade, todayroi, timeLeft,lastTradeTime  });

    } catch (error) {
        console.error("Error fetching lastTrade:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


const fetchPoints = async (req, res) => {
    try {
        const { telegram_id } = req.user;
        if (!telegram_id) {
            return res.status(400).json({ success: false, message: "Telegram ID is required" });
        }
        let user = await TelegramUser.findOne({ where: { telegram_id } });
        console.log(user.lastTrade);
        
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

         // ✅ Convert to UTC first, then IST
         const nowIST = moment().tz("Asia/Kolkata");
         const lastTradeIST = user.lastTrade ? moment.utc(user.lastTrade).tz("Asia/Kolkata") : null;

        if (!lastTradeIST) {
            console.log("Last trade is null. Showing Start button.");
            return res.json({ success: true, todayroi: user.todayroi, timeLeft: 0, showClaim: false });
        }

        let elapsedSeconds = nowIST.diff(lastTradeIST, "seconds");
        if (elapsedSeconds < 0) {
            console.log(`Invalid lastTrade timestamp: ${user.lastTrade}`);
            elapsedSeconds = 0; // Prevent negative elapsed time
        }

        // If 24 hours have passed, show Claim button
        if (elapsedSeconds >= 24 * 60 * 60) {
            console.log("24 hours passed. Showing Claim button.");
            return res.json({ success: true, todayroi: user.todayroi, timeLeft: 0, showClaim: true });
        }

        // Validate rewardPerDay
        const rewardPerDay = user.total_reward || 0; // Prevent undefined values
        if (rewardPerDay <= 0) {
            console.log("Invalid rewardPerDay. Cannot increase ROI.");
            return res.json({ success: true, todayroi: user.todayroi, timeLeft: 24 * 60 * 60 - elapsedSeconds, showClaim: false });
        }

        const rewardPerSec = rewardPerDay / (24 * 60 * 60);
        let newTodayROI = Math.min(user.todayroi + elapsedSeconds * rewardPerSec, rewardPerDay);

        // Ensure ROI doesn't go negative
        newTodayROI = Math.max(newTodayROI, 0);

        // Update today's ROI in the database
        await TelegramUser.update({ todayroi: newTodayROI }, { where: { telegram_id } });

        console.log(`Updated todayroi: ${newTodayROI}, timeLeft: ${24 * 60 * 60 - elapsedSeconds}`);

        // Calculate remaining time until claim
        const timeLeft = Math.max(24 * 60 * 60 - elapsedSeconds, 0);

        res.json({ success: true, todayroi: newTodayROI, timeLeft, showClaim: false });
    } catch (error) {
        console.error("Error fetching points:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};


// API to get lastTrade time for a user
const claimReward = async (req, res) => {
    console.log("Claim api hit");
    const { telegram_id } = req.body;

  try {
    let user = await TelegramUser.findOne({ where: { telegram_id } });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    let userDetail = await User.findOne({ where: { telegram_id:user.id } });
    if (!userDetail) return res.status(404).json({ success: false, message: "User not found" });
    
    let commission = user.total_reward;
     await Income.create({
        user_id: userDetail.id,
        user_id_fk: userDetail.username,
        amt: commission,
        comm: commission,
        remarks: "Node Reward",
        ttime: new Date(),
    });
    
    await Transaction.create({
        user_id: userDetail.id,
        user_id_fk: userDetail.username,
        amount: commission,
        credit_type: 1,
        remarks: "Node Reward",
        ttime: new Date(),
    });
    
    // Update user balance
    await User.update(
        { userbalance: userDetail.userbalance + commission },
        { where: { id: userDetail.id } }
    );
    await TelegramUser.update({ todayroi: 0,total_reward: 0, lastTrade : null }, { where: { telegram_id } });

    res.json({ success: true, message: "Reward claimed!" });
  } catch (error) {
    console.error("Error claiming reward:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }   
};


// API to get lastTrade time for a user
const updateTodayRoi = async (req, res) => {
    const { telegram_id, rewardPerDay ,lastUpdated } = req.body;
  try {
    let user = await TelegramUser.findOne({ where: { telegram_id } });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    const lastTrade = user.lastTrade;
    const now = new Date();
    const lastTradeTime = new Date(lastTrade);
    const timeLeft = Math.max((lastTradeTime - now) / 1000, 0); // Remaining time in seconds

    const newPoints = calculatePoints(timeLeft, rewardPerDay);
    console.log("New Points:", newPoints);

    await TelegramUser.update({ todayroi: newPoints,lastUpdated}, { where: { telegram_id } });

    res.json({ success: true, newPoints, message: "todayroi updated successfully!" });
  } catch (error) {
    console.error("Error todayroi update:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }   
};

const getMiningBonus = async (req, res) => {
  try {
    let user = req.user;
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    let userDetail = await User.findOne({ where: { telegram_id:user.id } });
    if (!userDetail) return res.status(404).json({ success: false, message: "User not found" });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of the day

    const todayBonus = await Income.sum("comm", {
        where: {
            user_id: userDetail.id,
            remarks: "Node Reward",
            ttime: {
                [Op.gte]: today, // Greater than or equal to today (start of the day)
            },
        },
    });
    const totalBonus = await Income.sum("comm", {
        where: {
            user_id: userDetail.id,
            remarks: "Node Reward",
        },
    });
    res.json({ success: true,todayBonus,totalBonus });
  } catch (error) {
    console.error("Error in getTodayMiningBonus:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }   
};



const getUserBalance = async (req, res) => {
    try {
      let user = req.user;
      if (!user) return res.status(404).json({ success: false, message: "User not found" });
      let userDetail = await User.findOne({ where: { telegram_id:user.id } });
      if (!userDetail) return res.status(404).json({ success: false, message: "User not found" });
        const userbalance = userDetail ? userDetail.userbalance : 0;
        const miningBonus = await Income.sum("comm", {
            where: {
                user_id: userDetail.id,
                remarks: "Node Reward",
            },
        });


        const referralBonus = await Income.sum("comm", {
            where: {
                user_id: userDetail.id,
                remarks: "Referral Bonus",
            },
        });

            const task_bonus = await UserTask.sum("bonus", {
                where: { telegram_id: user.telegram_id },
            });

            const taskBonus =  task_bonus || 0;

      res.json({ success: true,userbalance,miningBonus,taskBonus,referralBonus });
    } catch (error) {
      console.error("Error in getTodayMiningBonus:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }   
  };


  const getReferral = async (req, res) => {
    try {
      let user = req.user;
      if (!user) return res.status(404).json({ success: false, message: "User not found" });
      let userDetail = await User.findOne({ where: { telegram_id:user.id } });
      if (!userDetail) return res.status(404).json({ success: false, message: "User not found" });
        const sponsor = await User.count("id", {
            where: {
                sponsor: userDetail.id,
                active_status: "Active",
            },
        });


        const referralBonus = await Income.sum("comm", {
            where: {
                user_id: userDetail.id,
                remarks: "Referral Bonus",
            },
        });

      res.json({ success: true,sponsor,referralBonus});
    } catch (error) {
      console.error("Error in getReferral:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }   
  };


const startTask = async (req, res) => {
    try {
        const { telegram_id, task_id } = req.body;
        let telegramDetail = await TelegramUser.findOne({ where: { telegram_id:telegram_id } });
        if (!telegramDetail) return res.status(200).json({ success: false, message: "Telegram not found" });
        if (telegramDetail.is_connected==0) return res.status(200).json({ success: false, message: "Connect Account with WebPage" });
        let userDetail = await User.findOne({ where: { telegram_id:telegramDetail.id } });
        if (!userDetail) return res.status(200).json({ success: false, message: "User not found" });
        if (task_id==1 && userDetail.is_verify==0) return res.status(200).json({ success: false, message: "Verify Your Email Id!" });
         const [userTask, created] = await UserTask.findOrCreate({
            where: { telegram_id, task_id },
            defaults: { status: "pending" },
          });
          res.json({ success:true, message: created ? "Task started" : "Task already in progress" });

    } catch (error) {
        res.status(500).json({ error: "Error starting task" });
    }
  };


  const claimTask = async (req, res) => {
    try {
        const { telegram_id, task_id } = req.body;
        let taskDetail = await Task.findOne({ where: { id:task_id } });
        if (!taskDetail) return res.status(404).json({ success: false, message: "Task not found" });
        let telegramDetail = await TelegramUser.findOne({ where: { telegram_id:telegram_id } });
        if (!telegramDetail) return res.status(404).json({ success: false, message: "Telegram not found" });
        // let userDetail = await User.findOne({ where: { telegram_id:telegramDetail.id } });
        if (!userDetail) return res.status(404).json({ success: false, message: "User not found" });

        await UserTask.update(
            { status: "completed", bonus: taskDetail.reward }, 
            { where: { telegram_id, task_id } }
        );    
        
        await TelegramUser.update(
            { balance: telegramDetail.balance + taskDetail.reward }, // Updating balance in TelegramUser
            { where: { telegram_id: telegram_id } }
        );
        res.json({ message: "Task claimed successfully" });

    } catch (error) {
        res.status(500).json({ error: "Error starting task" });
    }
  };

const getTasks = async (req, res) => {
    try {
        const { telegram_id } = req.body;        
        const tasks = await Task.findAll({
            include: [
              {
                model: UserTask,
                as: "userTasks",
                where: { telegram_id },
                required: false,
              },
            ],
          });
      
          // Format response to include status
          const formattedTasks = tasks.map((task) => ({
            id: task.id,
            name: task.name,
            reward: task.reward,
            icon: task.icon,
            link: task.link,
            isTop: task.isTop,
            status: task.userTasks?.length ? task.userTasks[0].status : "not_started",
          }));


       
          res.json({buttonTask:formattedTasks});

    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };

  const getAlldata = async (req, res) => {
    try {
        const { telegram_id } = req.query;  // ✅ Use `req.query` instead of `req.body`
        
        if (!telegram_id) {
            return res.status(400).json({ success: false, message: "Telegram ID is required" });
        }

        const user = await TelegramUser.findOne({ where: { telegram_id }, raw: true });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.json({ success: true, user });

    } catch (error) {
        console.error("Error fetching user data:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const getTotalBalance = async (req, res) => {
    try {

        const user = req.user;
        if (!user) {
            return res.status(400).json({ success: false, message: "Telegram ID is required" });
        }

        const totalBalance = await TelegramUser.sum('balance', {
            where: { id:user.id }
          });

          const allBalance = await TelegramUser.sum('balance');

          const tabBalance = await TelegramUser.sum('tabbalance', {
            where: { id:user.id }
          });
        
  
          const bonus = await UserTask.sum('bonus', {
            where: { id:user.id }
          });
        //   const bonus = await UserTask.sum('bonus');



        return res.json({ success: true, totalBalance,allBalance: allBalance ,tabBalance:tabBalance,bonus:bonus});
    } catch (error) {
        console.error("Error calculating total balance:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const updateBalance = async (req, res) => {
    console.log(req.body);
    try {
        const userId = req.user?.id; // Ensure req.user is not undefined
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized: User ID missing" });
        }

        const user = await TelegramUser.findOne({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        await TelegramUser.increment({ balance: 1, tabbalance: 1 }, { where: { id: userId } });

        const updatedUser = await TelegramUser.findOne({ where: { id: userId } });

        return res.status(200).json({
            message: "Balance updated successfully",
            balance: updatedUser.balance,
            tabbalance: updatedUser.tabbalance,
        });

    } catch (error) {
        console.error("❌ Error updating balance:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

const fatchBalance = async (req, res) =>{
    // console.log(req.body);
    try{
        const userId = req.user?.id; // Ensure req.user is not undefined
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized: User ID missing" });
        }
        const user = await TelegramUser.findOne({ where: { id: userId } });
        // console.log(user);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const query = `SELECT SUM(coin) AS totalCoin FROM coin_bundle WHERE telegram_id = :telegramId`;
        const result = await sequelize.query(query, {
            type: QueryTypes.SELECT,
            replacements: { telegramId: user.telegram_id }, // Safe query binding
         });
         return res.status(200).json({
            message: "Balance Fatch successfully",
            tabbalance: user.tabbalance,
        });
    }
    catch (error) {
        console.error("❌ Error updating balance:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

const fatchpoint = async (req, res) =>{
    // console.log("Api fatching",req.body);
    try{
        const userId = req.user?.id; // Ensure req.user is not undefined
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized: User ID missing" });
        }
        const user = await TelegramUser.findOne({ where: { id: userId } });
        if(!user){
            return res.status(404).json({ message: "User not found" });
        }
        const userCount = await TelegramUser.count();

        const total = user.tabbalance;
        const inviteBonus = user.invite_bonus;
        const query = `SELECT SUM(coin) AS totalCoin FROM coin_bundle WHERE telegram_id = :telegramId`;
        const result = await sequelize.query(query, {
            type: QueryTypes.SELECT,
            replacements: { telegramId: user.telegram_id }, // Safe query binding
         });
         const query1 = `SELECT COALESCE(SUM(balance), 0) AS totalCoin FROM telegram_users`;
         const result1 = await sequelize.query(query1, { type: QueryTypes.SELECT });    
         
         const tid =user.telegram_id;
            // console.log(Euser);
         const totalCoin = parseInt(result[0]?.totalCoin, 10) || 0; // Ensure totalCoin is an integer
         const totalallCoin = parseInt(result1[0]?.totalCoin, 10) || 0; // Ensure newBalance is a float
        //  const totalBalance = parseFloat(totalCoin) + newBalance;
         return res.json({
            telegram_id :tid,
            coin: totalCoin,
            userCount: userCount,
            balance:total,
            totalallCoin:totalallCoin,
            inBonus:inviteBonus,
         });     
    }
    catch(error){
          return console.error("Somthing wrong in backend");
    }
  }


  const daycoin = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            // console.log("❌ Unauthorized: User ID missing");
            return res.status(401).json({ message: "Unauthorized: User ID missing" });
        }
        const user = await TelegramUser.findOne({ where: { id: userId } });
        if (!user) {
            // console.log("❌ User not found");
            return res.status(404).json({ message: "User not found" });
        }
        // const Euser = await User.findOne({ where: { telegram_id: user.telegram_id } });
        // let tid = null;

        // if (Euser) {
        //     tid = Euser.telegram_id; 
        // }        
        // Fetch day_coin data
        const query = "SELECT * FROM day_coin";
        const results = await sequelize.query(query, { type: QueryTypes.SELECT });
         
        // console.log("✅ Day Coin Data Fetched:", results);
        return res.json({
            message: "Today Task Coin",
            data: results, // Send fetched data
            // telegram_id :tid,
        });

    } catch (error) {
        console.error("❌ Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

const claimday = async (req,res) =>{
    console.log("day Claimed Api");
    try{
       const userId = req.user?.id;
       if(!userId){
        return res.json(401,'Unauthorised user');
       }        
       const user = await TelegramUser.findOne({where:{id: userId}});
       if(!user){
        return res.json(401,'user not found');
       }
    //    const Euser = await User.findOne({ where: { telegram_id: user.telegram_id } });      

    //     if (!Euser) {
    //         return res.json("Account Not Connected")
    //     } 
    //    const query = "SELECT * FROM coin_bundle WHERE telegram_id = :telegramId";
    //    console.log(query);
    const query = `SELECT * FROM coin_bundle WHERE telegram_id = :telegramId ORDER BY created_at DESC LIMIT 1`;
       const result = await sequelize.query(query, {
        type: QueryTypes.SELECT,
        replacements: { telegramId: user.telegram_id } // Safe query binding
    });
    const lastClaimed = result.length > 0 ? result[0].created_at : null; // Extract last claimed date
        const userClaimsCount = result.length;
     return res.json({ message: "Day task Coin", data: result, userClaimsCount,lastClaimed  });
    }
    catch(error){
       return console.error(error, "Day claim failed");
    }
  }

  const claimtoday = async (req, res) => {
    console.log("request send", req.body);
    const userId = req.user?.id;
    const { rewardId } = req.body; // Get reward ID from request
    if (!userId) {
        return res.status(401).json({ message: "Unauthorized user" });
    }
    try {
        // Fetch reward details from `day_coin`
        const coines = await sequelize.query(
            "SELECT * FROM day_coin WHERE id = ?",
            { replacements: [rewardId], type: sequelize.QueryTypes.SELECT }
        );
        //   console.log(coines);
        if (!coines.length) {
            return res.status(404).json({ message: "Reward not found" });
        }
        const { coins, id } = coines[0]; // Extract coin and bundle_id
        // console.log(bundle_id);
        // Fetch user details
        const user = await sequelize.query(
            "SELECT * FROM telegram_users WHERE id = ?",
            { replacements: [userId], type: sequelize.QueryTypes.SELECT }
        );
        if (!user.length) {
            return res.status(404).json({ message: "User not found" });
        }
        const telegramId = user[0].telegram_id;
        // Check last claim time
        const lastClaim = await sequelize.query(
            "SELECT * FROM coin_bundle WHERE telegram_id = ? ORDER BY created_at DESC LIMIT 1",
            { replacements: [telegramId], type: sequelize.QueryTypes.SELECT }
        );
        // const Euser = await User.findOne({ where: { telegram_id: telegramId } });
        //  if(!Euser){
        //     return res.json("User Not connected");
        //  }
        // if (lastClaim.length) {
        //     const lastClaimedAt = new Date(lastClaim[0].created_at);
        //     const now = new Date();
        //     const timeDiff = (now - lastClaimedAt) / (1000 * 60 * 60); // Convert ms to hours

        //     if (timeDiff < 24) {
        //         return res.status(400).json({
        //             message: "Sorry, you can't claim before 24 hours have passed since your previous claim.",
        //         });
        //     }
        // }
        // Insert new claim entry with coin & bundle_id
        await sequelize.query(
            "INSERT INTO coin_bundle (telegram_id, coin, bundle_id) VALUES (?, ?, ?)",
            { replacements: [telegramId, coins, id] }
        );  
        await TelegramUser.increment({balance: coins }, { where: { telegram_id: telegramId } });
        return res.json({ success: true, message: "🎉 Reward claimed successfully!" });

    } catch (error) {
        console.error("Error in claiming reward:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
module.exports = { getUserByTelegramId,getTelegramHistory,startTrade, getLastTrade,fetchPoints,claimReward,updateTodayRoi,getMiningBonus,getTasks,startTask,claimTask,getUserBalance,getReferral,getAlldata,getTotalBalance, updateBalance, fatchBalance, fatchpoint, daycoin, claimday,claimtoday};
