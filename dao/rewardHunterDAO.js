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
        return db.query(sqlMapping.rewardHunter.updatePlayerCoin, [p.diff, p.diff, p.id]);
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
        return db.query(sqlMapping.rewardHunter.updateMerchantBalance, [b.amount, b.amount, b.openid]);
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
    insertPlatformTransactionFlow: function(flow){
        return db.query(sqlMapping.rewardHunter.insertPlatformTransactionFlow, flow);
    }
}
