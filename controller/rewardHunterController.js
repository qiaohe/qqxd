"use strict";
var config = require('../config');
var _ = require('lodash');
var wechat = require('../common/wechat');
var redis = require('../common/redisClient');
var rewardHunterDAO = require('../dao/rewardHunterDAO');
var cookieParser = require('../common/cookieParser');
var xmljs = require('xml2js');
var moment = require('moment');
var request = require('request-promise');

function weightRandom(curValue, rate) {
    var r1 = Math.ceil(400 * rate);
    var r2 = Math.ceil(240 * rate);
    var r3 = Math.ceil(150 * rate);
    var r4 = Math.ceil((r1 + r2 + r3) * (1 - rate) / rate);
    var randomConfig = [{id: 3, weight: r1}, {id: 5, weight: r2}, {
        id: 8,
        weight: r3
    }, {id: 0, weight: r4}];
    var randomList = [];
    for (var i in randomConfig) {
        for (var j = 0; j < randomConfig[i].weight; j++) {
            randomList.push(randomConfig[i].id);
        }
    }
    var randomValue = randomList[Math.floor(Math.random() * randomList.length)];
    console.log(randomValue);
    return randomValue == curValue;
    // if (curValue != 0) {
    //     while (randomValue == curValue) {
    //         randomValue = randomList[Math.floor(Math.random() * randomList.length)];
    //     }
    // }
    // return randomValue;
}

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
        var data =  {};
        var cookies = cookieParser(req);
        var openid = cookies['openid'] || req.query.openid;
        rewardHunterDAO.findPlayer(openid).then(function (players) {
            data.basicInfo = players[0];
            data.speedSetting = config.speedSetting;
            return rewardHunterDAO.findGameLevel();
        }).then(function (levels) {
            data.gameLevel = levels;
            redis.setAsync('p:' + openid + ':l', '1').then(function (reply) {
                rewardHunterDAO.findSettings('marquee').then(function (item) {
                    data.marquee = item[0].value;
                    res.send({ret: 0, data: data});
                })
            })
        }).catch(function (err) {
            res.send({ret: 1, data: err.message});
        });
        return next();
    },

    registerMerchant: function (req, res, next) {
        var merchant = req.body;
        var cookies = cookieParser(req);
        merchant.openid = cookies['openid'];
        merchant.createDate = new Date();
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
        var openid = cookies['openid'] || req.query.openid;
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
        var openid = cookies['openid'] || req.query.openid;
        var multiple = +req.body.multiple;
        var seed = _.random(2000, 5000);
        var usedCoin = 0;
        var rewardCoin = 0;
        var level = {};
        var player = {};
        var merchantId = {};
        var merchant = {};
        rewardHunterDAO.findSettings('winningRatio').then(function (item) {
            var winRate = +item[0].value;
            var win = (multiple <= 1) || ((multiple > 1) && weightRandom(multiple, winRate));
            // var win = (multiple <= 1) || ((multiple > 1) && ((1 - config.currentComplexRate) * 100000 / multiple >= seed));
            redis.getAsync('p:' + openid + ':l').then(function (reply) {
                level = (reply && reply != null) ? +reply : 1;
                return rewardHunterDAO.findGameLevelById(level)
            }).then(function (levels) {
                if (Boolean(win)) {
                    rewardCoin = multiple * (level > 1 ? (level - 1) * 2.5 : 1);
                }
                else {
                    var index = _.indexOf(config.multipleSequence, multiple);
                    index = (index == config.multipleSequence.length - 1) ? 0 : index + 1;
                    rewardCoin = config.multipleSequence[index] * (level > 1 ? (level - 1) * 2.5 : 1);
                }
                usedCoin = levels[0].coin;
                rewardHunterDAO.findByOpenId(openid).then(function (players) {
                    if (players && players.length < 1) throw new Error('无效的openid，玩家不存在');
                    player = players[0];
                    merchantId = cookies['merchant'] && req.query.merchant || 'A8888';
                    return rewardHunterDAO.findByUniqueCode(merchantId);
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
                        return redis.getAsync('r:' + openid + ':b').then(function (b) {
                            var usedRechargeCoin = 0;
                            var rechargeBalance = b ? +b : 0;
                            if (rechargeBalance >= usedCoin) {
                                usedRechargeCoin = usedCoin;
                                redis.decrby('r:' + openid + ':b', usedCoin)
                            } else {
                                usedRechargeCoin = rechargeBalance;
                                redis.set('r:' + openid + ':b', 0);
                            }
                            return rewardHunterDAO.updatePlayerCoin({
                                id: player.id,
                                coinBalance: usedCoin - rewardCoin,
                                availableCoin: usedCoin - rewardCoin - usedRechargeCoin
                            });
                        })

                    }).then(function (result) {
                        return rewardHunterDAO.insertGamelog({
                            multiple: multiple,
                            openid: openid,
                            merchant: merchantId,
                            coin: usedCoin,
                            rewardCoin: rewardCoin,
                            createDate: new Date()

                        }).then(function (result) {
                            return rewardHunterDAO.findPlayer(openid);
                        });
                    }).then(function (players) {
                        players[0].win = win;
                        res.send({ret: 0, data: players[0]});
                    })
                })
            })
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
        var order = {};
        var merchant = {};
        var o = {}
        xmljs.parseString(req.body.toString("utf-8"), {explicitArray: false}, function (err, result) {
            o = result.xml;
            redis.getAsync('p:' + o.out_trade_no + 'processing').then(function (reply) {
                if (reply && reply == '1') {
                    res.send('SUCCESS');
                } else {
                    redis.set('p:' + o.out_trade_no + 'processing', '1');
                    rewardHunterDAO.findPrepaidOrderBy(o.out_trade_no).then(function (orders) {
                        order = orders[0];
                        return rewardHunterDAO.findByUniqueCode(order.merchant);
                    }).then(function (merchants) {
                        merchant = merchants[0];
                        return rewardHunterDAO.insertPlayerTransactionFlow({
                            player: order.player,
                            playerName: order.playerName,
                            createDate: new Date(),
                            merchantId: merchant.id,
                            merchantName: merchant.name,
                            productId: order.productId,
                            productName: order.productName,
                            amount: order.cash,
                            coin: order.coin,
                            type: 4
                        }).then(function (result) {
                            return rewardHunterDAO.updatePlayerCoin({
                                id: order.player,
                                coinBalance: order.coin * -1,
                                availableCoin: 0
                            })
                        });
                    }).then(function (result) {
                        return rewardHunterDAO.insertMerchantTransactionFlow({
                            player: order.player,
                            playerName: order.playerName,
                            createDate: new Date(),
                            merchantId: merchant.id,
                            merchantName: merchant.name,
                            commissionRate: merchant.commissionRate,
                            amount: order.cash * merchant.commissionRate,
                            type: 0
                        }).then(function (result) {
                            return rewardHunterDAO.updateMerchantBalance({
                                openid: merchant.openid,
                                withdrawAmount: 0,
                                balance: order.cash * merchant.commissionRate * (-1)
                            });
                        });
                    }).then(function (result) {
                        return rewardHunterDAO.insertPlatformTransactionFlow({
                            player: order.player,
                            playerName: order.playerName,
                            createDate: new Date(),
                            merchantId: merchant.id,
                            merchantName: merchant.name,
                            amount: order.cash,
                            type: 0
                        }).then(function (result) {
                            return rewardHunterDAO.updatePlatformBalance(order.cash);
                        }).then(function (result) {
                            return rewardHunterDAO.updateOrderStatus({id: order.id, status: 1});
                        }).then(function (result) {
                            redis.incrby('r:' + order.openid + ':b', order.coin);
                            res.send("SUCCESS");
                        });
                    })
                }
            })
        });
        return next();
    },

    createOrder: function (req, res, next) {
        wechat.lockAccount(req, res, next);
        var cookies = cookieParser(req);
        req.body.openid = cookies['openid'];
        req.body.merchant = cookies['merchant'];
        var productId = req.body.productId;
        var p = {};
        rewardHunterDAO.findProductBy(productId).then(function (products) {
            p = products[0];
            req.body.amount = p.cash * 100 + _.random(-10, 10);
            redis.incrAsync('pay:order:incr').then(function (reply) {
                req.body.orderNo = moment().format('YYYYMMDD') + req.body.merchant + _.padLeft(+reply, 4, '0');
                wechat.jsAPIPay(req, res, function (err, result) {
                    if (err) throw new Error(err.message);
                    p.result = result;
                    rewardHunterDAO.findByOpenId(req.body.openid).then(function (players) {
                        rewardHunterDAO.insertOrder({
                            productId: p.id,
                            productName: p.name,
                            cash: p.cash,
                            coin: p.coin,
                            createDate: new Date(),
                            status: 0,
                            orderNo: req.body.orderNo,
                            merchant: req.body.merchant,
                            openid: req.body.openid,
                            player: players[0].id,
                            playerName: players[0].nickname
                        }).then(function (result) {
                            res.send({ret: 0, data: p.result});
                        })
                    })
                })
            });
        }).catch(function (err) {
            res.send({ret: 1, message: err.message});
        });
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
        wechat.lockAccount(req, res, next);
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
                        return rewardHunterDAO.updateMerchantBalance({
                            openid: openid,
                            withdrawAmount: amount,
                            balance: amount
                        });
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
            if (merchants.length < 1) console.log('商家不存在');
            var m = merchants[0];
            data.basic = {
                id: m.id,
                withdrawAmount: m.withdrawAmount,
                balance: m.balance,
                uniqueCode: m.uniqueCode,
                name: m.name,
                status: m.status
            };
            return rewardHunterDAO.findCommissions(m.id)
        }).then(function (commissions) {
            data.commissions = commissions;
            res.send({ret: 0, data: data});
        });
        return next();
    },

    exchangeReward: function (req, res, next) {
        wechat.lockAccount(req, res, next);
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
                    playerName: player.nickname,
                    type: 1,
                    amount: +reward.cash,
                    reward: reward.id,
                    coin: reward.coin,
                    createDate: new Date()
                }).then(function (result) {
                    return rewardHunterDAO.insertPlatformTransactionFlow({
                        player: player.id,
                        playerName: player.nickname,
                        type: 2,
                        amount: +reward.cash,
                        createDate: new Date()
                    })
                }).then(function (result) {
                    return rewardHunterDAO.updatePlayerCoin({
                        id: player.id, coinBalance: reward.coin,
                        availableCoin: reward.coin
                    });
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
                            playerName: player.nickname,
                            type: 1,
                            amount: +reward.cash,
                            reward: reward.id,
                            coin: reward.coin,
                            createDate: new Date()
                        }).then(function (result) {
                            return rewardHunterDAO.insertPlatformTransactionFlow({
                                player: player.id,
                                playerName: player.nickname,
                                type: 2,
                                amount: +reward.cash,
                                createDate: new Date()
                            })
                        }).then(function (result) {
                            return rewardHunterDAO.updatePlayerCoin({
                                id: player.id, coinBalance: reward.coin,
                                availableCoin: reward.coin
                            });
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
    },
    addCoin: function (req, res, next) {
        var cookies = cookieParser(req);
        var openid = cookies['openid'] || req.query.openid;
        var player = {};
        rewardHunterDAO.findByOpenId(openid).then(function (players) {
            player = players[0];
            if (player.hasCoupon) return res.send({ret: 0, message: '已优惠3金币'});
            redis.setAsync('r:' + openid + ':b', '30').then(function (reply) {
                rewardHunterDAO.updatePlayerCoin({
                    id: player.id,
                    coinBalance: -3,
                    availableCoin: 0
                }).then(function (result) {
                    rewardHunterDAO.updatePlayer({id: player.id, hasCoupon: 1}).then(function (result) {
                        return res.send({ret: 0, message: '已优惠30金币'});
                    })
                });
            })
        }).catch(function (err) {
            res.send({ret: 1, message: err.message});
        });
        return next();
    },
    getGameLog: function (req, res, next) {
        rewardHunterDAO.findGameLog({
            from: +req.query.from,
            size: +req.query.size
        }).then(function (result) {
            res.send({ret: 0, data: result});
        }).catch(function (err) {
            res.send({ret: 1, message: err.message});
        });
        return next();
    }
}
