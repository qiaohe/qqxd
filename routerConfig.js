var authController = require('./controller/authController');
var thirdPartyController = require('./controller/thirdPartyController');
var wechatController = require('./controller/wechatController');
var rewardHunterController = require('./controller/rewardHunterController');
module.exports = [
    {
        method: "post",
        path: "/api/login",
        handler: authController.login
    },
    {
        method: "post",
        path: "/api/logout",
        handler: authController.logout,
        secured: 'user'
    },
    {
        method: 'get',
        path: '/api/qiniu/token',
        handler: thirdPartyController.getQiniuToken
    },
    {
        method: "get",
        path: "/api/signature",
        handler: authController.getSignature
    },
    {
        method: "get",
        path: "/api/wechat",
        handler: authController.checkSignature
    },
    {
        method: "post",
        path: "/api/wechat",
        handler: authController.wechatCallback
    },
    {
        method: "get",
        path: "/api/wechat/login",
        handler: wechatController.callback
    },
    {
        method: "get",
        path: "/api/wechat/merchant",
        handler: wechatController.callbackMerchant
    },
    {
        method: "get",
        path: "/api/wechat/withdraw",
        handler: wechatController.callbackMerchant
    },
    {
        method: "get",
        path: "/api/products",
        handler: rewardHunterController.getProducts
    },
    {
        method: "get",
        path: "/api/player",
        handler: rewardHunterController.getPlayerInfo,
        secured: 'user'
    },
    {
        method: "put",
        path: "/api/player/gameLevel",
        handler: rewardHunterController.changeGameLevel,
        secured: 'user'
    },
    {
        method: "post",
        path: "/api/player/games",
        handler: rewardHunterController.playGames,
        secured: 'user'
    },
    {
        method: "post",
        path: "/api/merchants",
        handler: rewardHunterController.registerMerchant
    },
    {
        method: "get",
        path: "/api/merchants",
        handler: rewardHunterController.getMerchant
    },
    {
        method: "get",
        path: "/api/rewards",
        handler: rewardHunterController.getRewards
    },
    {
        method: "post",
        path: "/api/rewards/:id/exchange",
        handler: rewardHunterController.exchangeReward
    },

    {
        method: "post",
        path: "/api/payment/callback",
        handler: rewardHunterController.paymentCallback
    },
    {
        method: "post",
        path: "/api/payment/orders",
        handler: rewardHunterController.createOrder
    },
    {
        method: "post",
        path: "/api/withdraw",
        handler: rewardHunterController.withdraw
    },
    {
        method: "get",
        path: "/api/merchantProfile",
        handler: rewardHunterController.getMerchantProfile
    }
];
