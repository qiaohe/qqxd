"use strict";
var config = require('../config');
var _ = require('lodash');
var wechat = require('../common/wechat');
var redis = require('../common/redisClient');
var rewardHunterDAO = require('../dao/rewardHunterDAO');

module.exports = {
    getProducts: function (req, res, next) {
        rewardHunterDAO.findProducts().then(function (products) {
            res.send({ret: 0, data: products});
        }).catch(function (err) {
            res.send({ret: 1, data: err.message});
        });
        return next();
    },
    getPlayerInfo: function (req, res, next) {
        var data = {};
        var openid = 'o7niFsy0QsJreSCTYkyLpbqPa7cc';
        rewardHunterDAO.findPlayer(openid).then(function (players) {
            data.basicInfo = players[0];
            data.speedSetting = config.speedSetting;
            return rewardHunterDAO.findGameLevel();
        }).then(function (levels) {
            data.gameLevel = levels;
            res.send({ret: 0, data: data});
        }).catch(function (err) {
            res.send({ret: 1, data: err.message});
        });
        return next();
    },
    registerMerchant: function (req, res, next) {
        var merchant = req.body;
        rewardHunterDAO.updateMerchant(req.body).then(function (result) {
            res.send({ret: 0, message: '更新成功。'});
        }).catch(function (err) {
            res.send({ret: 1, data: err.message});
        });
        return next();
    },
    changeGameLevel: function (req, res, next) {
        //var uid = req.user.id;
        var uid = 3;
        var key = 'p:' + '3' + ':l';
        redis.setAsync('p:' + '3' + ':l', req.body.level).then(function (reply) {
            res.send({ret: 0, message: '修改成功。'})
        }).catch(function (err) {
            res.send({ret: 1, data: err.message});
        });
        return next();
    },
    playGames: function (req, res, next) {
        var multiple = +req.body.multiple;
        var seed = _.random(0, 1);
        var usedCoin = 0;
        var rewardCoin = 0;
        var level = {};
        var win = ((multiple > 1) && ((1 - config.currentComplexRate) / multiple >= seed));
        redis.getAsync('p:' + '3' + ':l').then(function (reply) {
            level = (reply && reply != null) ? +reply : 1;
            return rewardHunterDAO.findGameLevelById(level)
        }).then(function (levels) {
            var index = _.indexOf(multiple);
            index = (index == config.multipleSequence.length - 1) ? 0 : index + 1;
            rewardCoin = (win ? multiple : config.multipleSequence[index]) * levels[0].coin;
            usedCoin = levels[0].coin;
            return rewardHunterDAO.insertPlayerTransactionFlow({
                player: 3,
                playerName: '何桥',
                type: 3,
                merchantId: 1,
                merchantName: '西湖醋鱼',
                coin: usedCoin,
                createDate: new Date(),
                gameLevel: level
            });
        }).then(function (result) {
            return rewardHunterDAO.insertPlayerTransactionFlow({
                player: 3,
                playerName: '何桥',
                type: 2,
                merchantId: 1,
                merchantName: '西湖醋鱼',
                coin: rewardCoin,
                createDate: new Date(),
                gameLevel: level
            });
        }).then(function (result) {
            return rewardHunterDAO.updatePlayerCoin({id: 3, diff: usedCoin - rewardCoin});
        }).then(function (result) {
            return rewardHunterDAO.findPlayer('o7niFsy0QsJreSCTYkyLpbqPa7cc');
        }).then(function (players) {
            var player = players[0];
            player.win = win;
            res.send({ret: 0, data: player});
        }).catch(function (err) {
            res.send({ret: 1, data: err.message});
        });
        return next();
    },
    getRewards: function (req, res, next) {
        rewardHunterDAO.findRewards({
            from: req.query.from,
            size: req.query.size
        }).then(function (rewards) {
            rewards && rewards.length > 0 && rewards.forEach(function (r) {
                if (r.level == "一等奖" || r.level == "二等奖") r.deliverAddressUrl = config.deliverAddressUrl;
            });
            res.send({ret: 0, data: rewards});
        }).catch(function (err) {
            res.send({ret: 1, data: err.message});
        });
        return next();
    },
    paymentCallback: function (req, res, next) {
        return next();
    },
    createOrder: function (req, res, next) {
        return wechat.jsAPIPay(req, res, next);
    },
    getMerchant: function (req, res, next) {
        var openid = req.query.openid;
        rewardHunterDAO.findMerchantByOpenId(openid).then(function (result) {
            if (result.length < 1) return res.send({ret: 0, data: {}});
            res.send({ret: 0, data: result[0]});
        }).catch(function (err) {
            res.send({ret: 1, data: err.message});
        });
        return next();
    },
    withdraw: function (req, res, next) {
        var openid = req.body.openid;
        rewardHunterDAO.findMerchantByOpenId(openid).then(function (merchants) {
            var m = merchants[0];
            return rewardHunterDAO.insertMerchantTransactionFlow({
                merchantId: m.id,
                merchantName: m.name,
                type: 1,
                amount: req.body.amount,
                commissionRate: m.commissionRate,
                createDate: new Date()
            }).then(function (result) {
                return rewardHunterDAO.updateMerchantBalance({openid: openid, amount: +req.body.amount});
            }).then(function (result) {
                res.send({ret: 0, message: '提现成功'})
            })
        })
        // return wechat.withdraw(req, res, next);
    },
    getMerchantProfile: function (req, res, next) {
        var data = {};
        rewardHunterDAO.findMerchantByOpenId(req.query.openid).then(function (merchants) {
            var m = merchants[0];
            data.basic = {
                id: m.id,
                withdrawAmount: m.withdrawAmount,
                balance: m.balance,
                uniqueCode: m.uniqueCode,
                name: m.name
            };
            return rewardHunterDAO.findCommissions(req.query.openid)
        }).then(function (commissions) {
            data.commissions = commissions;
            res.send({ret: 0, data: data});
        });
        return next();
    }
}