"use strict";
var config = require('../config');
var _ = require('lodash');
var wechat = require('../common/wechat');
var redis = require('../common/redisClient');
var rewardHunterDAO = require('../dao/rewardHunterDAO');
var cookieParser = require('../common/cookieParser');

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
        var cookies = cookieParser(req);
        var openid = cookies['openid'];
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
        var cookies = cookieParser(req);
        merchant.openid = cookies['openid'];
        rewardHunterDAO.findByUniqueCode(merchant.uniqueCode).then(function (merchants) {
            if (merchants && merchants.length > 0) throw new Error('唯一码已被占用。');
            return rewardHunterDAO.updateMerchant(merchant);
        }).then(function (result) {
            res.send({ret: 0, message: '更新成功。'});
        }).catch(function (err) {
            res.send({ret: 1, message: err.message});
        });
        return next();
    },

    changeGameLevel: function (req, res, next) {
        var cookies = cookieParser(req);
        var openid = cookies['openid'];
        var key = 'p:' + openid + ':l';
        redis.setAsync('p:' + openid + ':l', req.body.level).then(function (reply) {
            res.send({ret: 0, message: '修改成功。'})
        }).catch(function (err) {
            res.send({ret: 1, data: err.message});
        });
        return next();
    },
    playGames: function (req, res, next) {
        var cookies = cookieParser(req);
        var openid = cookies['openid'];
        var multiple = +req.body.multiple;
        var seed = _.random(0, 1);
        var usedCoin = 0;
        var rewardCoin = 0;
        var level = {};
        var player = {};
        var merchant = {};
        var win = ((multiple > 1) && ((1 - config.currentComplexRate) / multiple >= seed));
        redis.getAsync('p:' + openid + ':l').then(function (reply) {
            level = (reply && reply != null) ? +reply : 1;
            return rewardHunterDAO.findGameLevelById(level)
        }).then(function (levels) {
            var index = _.indexOf(multiple);
            index = (index == config.multipleSequence.length - 1) ? 0 : index + 1;
            rewardCoin = (win ? multiple : config.multipleSequence[index]) * levels[0].coin;
            usedCoin = levels[0].coin;
            rewardHunterDAO.findByOpenId(openid).then(function (players) {
                if (players && players.length < 1) throw new Error('无效的openid，玩家不存在');
                player = players[0];
                return rewardHunterDAO.findByUniqueCode(cookies['merchant']);
            }).then(function (merchants) {
                if (merchants && merchants.length < 1) throw new Error('无效的商家,商家不存在。');
                merchant = merchants[0];
                return rewardHunterDAO.insertPlayerTransactionFlow({
                    player: player.id,
                    playerName: player.nickname,
                    type: 3,
                    merchantId: merchant.id,
                    merchantName: merchant.name,
                    coin: usedCoin,
                    createDate: new Date(),
                    gameLevel: level
                })
            })
        }).then(function (result) {
            return rewardHunterDAO.insertPlayerTransactionFlow({
                player: player.id,
                playerName: player.nickname,
                type: 2,
                merchantId: merchant.id,
                merchantName: merchant.name,
                coin: rewardCoin,
                createDate: new Date(),
                gameLevel: level
            });
        }).then(function (result) {
            return rewardHunterDAO.updatePlayerCoin({id: player.id, diff: usedCoin - rewardCoin});
        }).then(function (result) {
            return rewardHunterDAO.findPlayer(openid);
        }).then(function (players) {
            players[0].win = win;
            res.send({ret: 0, data: players[0]});
        }).catch(function (err) {
            res.send({ret: 1, data: err.message});
        });
        return next();
    },
    getRewards: function (req, res, next) {
        var cookies = cookieParser(req);
        var openid = cookies['openid'];
        var data = {};
        rewardHunterDAO.findByOpenId(cookies['openid']).then(function (players) {
            data.basic = {coinBalance: players[0].coinBalance, availableCoin: players[0].availableCoin};
            return rewardHunterDAO.findRewards({
                from: req.query.from,
                size: req.query.size
            })
        }).then(function (rewards) {
            rewards && rewards.length > 0 && rewards.forEach(function (r) {
                if (r.level == "一等奖" || r.level == "二等奖") r.deliverAddressUrl = config.deliverAddressUrl;
            });
            data.rewards = rewards;
            res.send({ret: 0, data: data});
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
        var cookies = cookieParser(req);
        var openid = cookies['openid'];
        rewardHunterDAO.findMerchantByOpenId(openid).then(function (result) {
            if (result.length < 1) return res.send({ret: 0, data: {}});
            res.send({ret: 0, data: result[0]});
        }).catch(function (err) {
            res.send({ret: 1, data: err.message});
        });
        return next();
    },

    withdraw: function (req, res, next) {
        var cookies = cookieParser(req);
        var openid = cookies['openid'];
        var m = {};
        var amount = +req.body.amount;
        rewardHunterDAO.findMerchantByOpenId(openid).then(function (merchants) {
            m = merchants[0];
            req.body.openid = openid;
            req.body.desc = config.wechat.merchantWithdrawDesc;
            req.body.orderPrefix = 'm';
            req.body.sequence = m.id;
            req.body.realName = m.nickname;
            req.body.amount = amount * 100;
            wechat.withdraw(req, res, function (err, response, body) {
                if (err) throw err;
                if (!err && response.statusCode == 200) {
                    return rewardHunterDAO.insertMerchantTransactionFlow({
                        merchantId: m.id,
                        merchantName: m.name,
                        type: 1,
                        amount: amount,
                        commissionRate: m.commissionRate,
                        createDate: new Date()
                    }).then(function (result) {
                        return rewardHunterDAO.updateMerchantBalance({openid: openid, amount: amount});
                    }).then(function (result) {
                        res.send({ret: 0, message: '提现成功'})
                    })
                }
            })
        });
        return next();
    },

    getMerchantProfile: function (req, res, next) {
        var cookies = cookieParser(req);
        var openid = cookies['openid'];
        var data = {};
        rewardHunterDAO.findMerchantByOpenId(openid).then(function (merchants) {
            var m = merchants[0];
            data.basic = {
                id: m.id,
                withdrawAmount: m.withdrawAmount,
                balance: m.balance,
                uniqueCode: m.uniqueCode,
                name: m.name
            };
            return rewardHunterDAO.findCommissions(m.id)
        }).then(function (commissions) {
            data.commissions = commissions;
            res.send({ret: 0, data: data});
        });
        return next();
    },

    exchangeReward: function (req, res, next) {
        var cookies = cookieParser(req);
        var openid = cookies['openid'];
        var player = {};
        var reward = {};
        req.body = {};
        rewardHunterDAO.findByOpenId(openid).then(function (players) {
            if (players.length < 1) throw new Error('玩家没有注册，请重新登录再兑换。');
            player = players[0];
            return rewardHunterDAO.findRewardById(req.params.id);
        }).then(function (rewards) {
            reward = rewards[0];
            if (reward.coin > player.availableCoin) throw new Error('金币余额不足，不能兑换。');
            if (reward.level == "一等奖" || reward.level == "二等奖") {
                return rewardHunterDAO.insertPlayerTransactionFlow({
                    player: player.id,
                    playerName: player.name,
                    type: 1,
                    amount: +reward.cash,
                    reward: reward.id,
                    coin: reward.coin,
                    createDate: new Date()
                }).then(function (result) {
                    return rewardHunterDAO.insertPlatformTransactionFlow({
                        player: player.id,
                        playerName: player.name,
                        type: 2,
                        amount: +reward.cash,
                        createDate: new Date()
                    })
                }).then(function (result) {
                    return rewardHunterDAO.updatePlayerCoin({id: player.id, diff: reward.coin});
                }).then(function (result) {
                    res.send({ret: 0, message: '提现成功。'})
                })
            } else {
                req.body.openid = openid;
                req.body.amount = reward.cash * 100;
                req.body.desc = config.wechat.playerWithdrawDesc;
                req.body.orderPrefix = 'p';
                req.body.sequence = player.id;
                req.body.realName = player.nickname;
                wechat.withdraw(req, res, function (err, response, body) {
                    if (err) throw new Error(err.message);
                    if (!err && response.statusCode == 200) {
                        return rewardHunterDAO.insertPlayerTransactionFlow({
                            player: player.id,
                            playerName: player.name,
                            type: 1,
                            amount: +reward.cash,
                            reward: reward.id,
                            coin: reward.coin,
                            createDate: new Date()
                        }).then(function (result) {
                            return rewardHunterDAO.insertPlatformTransactionFlow({
                                player: player.id,
                                playerName: player.name,
                                type: 2,
                                amount: +reward.cash,
                                createDate: new Date()
                            })
                        }).then(function (result) {
                            return rewardHunterDAO.updatePlayerCoin({id: player.id, diff: reward.coin});
                        }).then(function (result) {
                            res.send({ret: 0, message: '提现成功。'})
                        })
                    }
                });
            }

        }).catch(function (err) {
            res.send({ret: 1, message: err.message});
        });
        return next();
    }
}