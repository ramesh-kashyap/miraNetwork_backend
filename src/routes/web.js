const express = require('express');
let router = express.Router();

const AuthController = require("../controllers/AuthController");
const IncomeController = require("../controllers/incomeController");
const TelegramController = require("../controllers/TelegramController");
const DashboardController = require("../controllers/DashboardController");
const authMiddleware = require("../middleware/authMiddleware"); // JWT Auth Middleware
const telegramAuthMiddleware = require("../middleware/telegramAuthMiddleware"); // JWT Auth Middleware
const passport = require('passport');
const googleController = require('../controllers/googleController');
const teamController = require('../controllers/teamController');
const InvestController = require('../controllers/InvestController');
const GraphController = require('../controllers/GraphController');

const { getVip } = require("../services/userService");
const  withdrawController  = require('../controllers/withdrawController');




router.post('/google', googleController.verifyGoogleToken);
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/change-password', authMiddleware,AuthController.GetchangePassword); // ✅ No DashboardController here


router.get("/direct-income", authMiddleware, IncomeController.getDirectIncome);
router.get("/level-income", authMiddleware, IncomeController.getLevelIncome);
router.get("/Roi-income", authMiddleware, IncomeController.getRoiIncome);
router.post("/team", authMiddleware ,teamController.getTeam);
router.get('/list', authMiddleware, teamController.listUsers);
router.get("/userinfo", authMiddleware, DashboardController.getUserDetails);
router.get("/get-chart-data", authMiddleware, DashboardController.getLast15DaysIncome);
router.get("/getTransactions", authMiddleware, DashboardController.getTransactions);
router.get("/liveRates", authMiddleware, DashboardController.liveRates);
router.post("/getTelegramId", authMiddleware, DashboardController.getTelegramId);
router.get("/usdt-address", authMiddleware, DashboardController.getUsdtAddress);
router.get('/profile', authMiddleware, AuthController.getUserProfile);
router.put('/Update-Profile', authMiddleware, AuthController.updateUserProfile);
router.post('/send-code', DashboardController.sendCode);
router.post('/reset-password',  DashboardController.resetPassword);
router.get("/available-balance", authMiddleware, DashboardController.getAvailableBalance);
router.post("/connect-telegram", authMiddleware, DashboardController.connectTelegram);
router.post("/verify-account", authMiddleware, DashboardController.verifyAccount);


router.get("/deposit-History", authMiddleware, InvestController.getHistory);
router.post("/recharge", authMiddleware, InvestController.confirmDeposit);
router.get("/telegram-history", authMiddleware, TelegramController.getTelegramHistory);
router.post("/generate-wallet", authMiddleware, InvestController.generateWallet);
router.get("/roi", authMiddleware, GraphController.getRoi);
// withdraw
router.post("/withdrawal",authMiddleware,withdrawController.withdrawRequest)
router.get("/sendCode",authMiddleware,withdrawController.sendCode)
router.get("/withdraws",authMiddleware,withdrawController.getUserWithdraws)
router.get("/getWithdrawInfo",authMiddleware,withdrawController.getWithdrawInfo)


// telegram api 
router.post('/telegram-login', AuthController.loginWithTelegram);
router.post('/telegram-user-detail', TelegramController.getUserByTelegramId);
router.post('/start-trade', telegramAuthMiddleware,TelegramController.startTrade);
router.post('/get-last-trade',telegramAuthMiddleware, TelegramController.getLastTrade);

router.get('/all-data',telegramAuthMiddleware, TelegramController.getAlldata);
router.post('/updateBalance', telegramAuthMiddleware,TelegramController.updateBalance);
router.get('/fatchBalance', telegramAuthMiddleware,TelegramController.fatchBalance);
router.get('/fatchCoin', telegramAuthMiddleware,TelegramController.fatchCoin);
router.post('/fatchPoint', telegramAuthMiddleware,TelegramController.fatchpoint);

router.get('/baycoin', telegramAuthMiddleware,TelegramController.daycoin);
router.get('/claim-day', telegramAuthMiddleware,TelegramController.claimday);
router.post('/claim-reward',telegramAuthMiddleware,TelegramController.claimtoday);
router.get('/fetch-points',telegramAuthMiddleware, TelegramController.fetchPoints);
router.post('/update-today-roi',telegramAuthMiddleware, TelegramController.updateTodayRoi);
router.get('/get-mining-bonus',telegramAuthMiddleware, TelegramController.getMiningBonus);
router.post('/getTasks',telegramAuthMiddleware, TelegramController.getTasks);
router.get('/get-user-balance',telegramAuthMiddleware, TelegramController.getUserBalance);
router.post('/startTask',telegramAuthMiddleware, TelegramController.startTask);
router.post('/claimTask',telegramAuthMiddleware, TelegramController.claimTask);
router.get('/getReferral',telegramAuthMiddleware, TelegramController.getReferral);

router.get('/total-balance', telegramAuthMiddleware,TelegramController.getTotalBalance);
router.get('/all-data',telegramAuthMiddleware, TelegramController.getAlldata);
router.get('/TotalMember',telegramAuthMiddleware, TelegramController.getTotalMember);
router.get('/topuser',telegramAuthMiddleware, TelegramController.getTopUser);
router.post('/streak', telegramAuthMiddleware, TelegramController.streak);
router.get('/streak_time', telegramAuthMiddleware, TelegramController.streak_time);

router.get('/TotalTeam',telegramAuthMiddleware, TelegramController.getTotalTeam);

router.get('/checkquest',telegramAuthMiddleware, TelegramController.checkquest);
router.post('/dailyquest', telegramAuthMiddleware, TelegramController.dailyquest);
router.get('/coins', telegramAuthMiddleware, TelegramController.coins);
router.post('/buy-package', telegramAuthMiddleware, TelegramController.buyPackage);
router.get('/fetch_gudies', telegramAuthMiddleware, TelegramController.fatchgudies);
router.post('/send_gift', telegramAuthMiddleware, TelegramController.sendgift);
// app.get('/api/auth.daycoin', (req, res) => {
//   res.json({ message: 'Baycoin route working!' });
// });


router.get("/vip/:userId", async (req, res) => {
  const { userId } = req.params;
  const vipLevel = await getVip(userId);
  res.json({ userId, vipLevel });
});



// Mount the router on /api/auth so that /register becomes /api/auth/register
const initWebRouter = (app) => {
    app.use('/api/auth', router);
  };

  module.exports = initWebRouter;
