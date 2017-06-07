"use strict";
var db = require('../common/db');
var sqlMapping = require('./sqlMapping');
module.exports = {
    findProducts: function () {
        return db.query(sqlMapping.rewardHunter.findProducts);
    },
    findByUserName: function (name) {
        return db.query(sqlMapping.rewardHunter.findByUserName, name);
    },
    findByOpenId: function (openid) {
        return db.query(sqlMapping.rewardHunter.findByOpenId, openid);
    },
    insertPlayer: function (player) {
        return db.query(sqlMapping.rewardHunter.insertPlayer, player);
    },
    findPlayer: function (openid) {
        return db.query(sqlMapping.rewardHunter.findPlayer, openid);
    },
    findGameLevel: function () {
        return db.query(sqlMapping.rewardHunter.findGameLevel);
    },
    findGameLevelById: function (level) {
        return db.query(sqlMapping.rewardHunter.findGameLevelById, level);
    },
    insertPlayerTransactionFlow: function (flow) {
        return db.query(sqlMapping.rewardHunter.insertPlayerTransactionFlow, flow);
    },
    updatePlayerCoin: function (p) {
        return db.query(sqlMapping.rewardHunter.updatePlayerCoin, [p.coinBalance, p.availableCoin, p.id]);
    },
    updatePlayer: function (p) {
        return db.query(sqlMapping.rewardHunter.updatePlayer, [p, p.id]);
    },
    findRewards: function (page) {
        return db.query(sqlMapping.rewardHunter.findRewards, [+page.from, +page.size]);
    },
    findMerchantByOpenId: function (openid) {
        return db.query(sqlMapping.rewardHunter.findMerchantByOpenId, openid);
    },
    insertMerchant: function (merchant) {
        return db.query(sqlMapping.rewardHunter.insertMerchant, merchant);
    },
    updateMerchant: function (merchant) {
        return db.query(sqlMapping.rewardHunter.updateMerchant, [merchant, merchant.openid]);
    },
    insertMerchantTransactionFlow: function (flow) {
        return db.query(sqlMapping.rewardHunter.insertMerchantTransactionFlow, flow);
    },
    updateMerchantBalance: function (b) {
        return db.query(sqlMapping.rewardHunter.updateMerchantBalance, [b.withdrawAmount, b.balance, b.openid]);
    },
    findCommissions: function (merchantId) {
        return db.query(sqlMapping.rewardHunter.findCommissions, merchantId);
    },
    findRewardById: function (id) {
        return db.query(sqlMapping.rewardHunter.findRewardById, id);
    },
    findByUniqueCode: function (uniqueCode) {
        return db.query(sqlMapping.rewardHunter.findByUniqueCode, uniqueCode);
    },
    insertPlatformTransactionFlow: function (flow) {
        return db.query(sqlMapping.rewardHunter.insertPlatformTransactionFlow, flow);
    },
    findProductBy: function (productId) {
        return db.query(sqlMapping.rewardHunter.findProductBy, productId);
    },
    insertOrder: function (order) {
        return db.query(sqlMapping.rewardHunter.insertOrder, order);
    },
    findPrepaidOrderBy: function (orderNo) {
        return db.query(sqlMapping.rewardHunter.findPrepaidOrderBy, orderNo);
    },
    updatePlatformBalance: function (balance) {
        return db.query(sqlMapping.rewardHunter.updatePlatformBalance, [+balance, +balance]);
    },
    updateOrderStatus: function (o) {
        return db.query(sqlMapping.rewardHunter.updateOrderStatus, [o, o.id]);
    },
    findPlayerStatus: function (openid) {
        return db.query(sqlMapping.rewardHunter.findPlayerStatus, openid);
    },
    insertGamelog: function (log) {
        return db.query(sqlMapping.rewardHunter.insertGamelog, log);
    },
    findSettings: function (key) {
        return db.query(sqlMapping.rewardHunter.findSettings, key);
    },

    findGameLog: function (page) {
        return db.query(sqlMapping.rewardHunter.findGameLog, [+page.from, +page.size]);
    }
}
