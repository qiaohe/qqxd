"use strict";
var config = require('../config');
var _ = require('lodash');
var md5 = require('md5');
var redis = require('../common/redisClient');
var i18n = require('../i18n/localeMessage');
var moment = require('moment');
var rewardHunterDAO = require('../dao/rewardHunterDAO');
var request = require('request-promise');
var wechat = require('../common/wechat');
var url = require('url');
var uuid = require('node-uuid');
var cookieParser = require('../common/cookieParser');
function authorizedBy(req, res, next) {
    var code = req.query.code;
    if (!code) {
        res.header('Location', wechat.getAuthorizeUrl(wechat.getRedirectUrl(req.url), 0));
        res.send(302);
    } else {
        request(wechat.getAccessTokenUrl(code), function (err, response, body) {
            if (err) throw err;
            var o = JSON.parse(body);
            if (o.openid) {
                res.setHeader('Set-Cookie', ['openid=' + o.openid + ';path="/"','merchant=' + req.query.merchant + ';path="/"', 'token=' + o.access_token + ';path="/"']);
                return rewardHunterDAO.findByOpenId(o.openid).then(function (users) {
                    if (users.length > 0) {
                        // res.header('Location', config.redirectUrlMapping[+req.query.redirectUrlNo] + '?openid=' + o.openid + '&merchant=' + req.query.merchant + '&t=' + new Date().getTime());
                        res.header('Location', config.redirectUrlMapping[+req.query.redirectUrlNo]+ '?merchant=' + req.query.merchant);
                        redis.set('r:' + o.openid + ':b', users[0].coinBalance - users[0].availableCoin);
                        return res.send(302);
                    } else {
                        request(wechat.getUserInfoUrl(o.access_token, o.openid), function (err, response, body) {
                            if (err) return res.send(403, i18n.get('access.not.authorized'));
                            var player = JSON.parse(body);
                            delete player.privilege;
                            player.createDate = new Date();
                            return rewardHunterDAO.insertPlayer(player).then(function (result) {
                                // res.header('Location', config.redirectUrlMapping[+req.query.redirectUrlNo] + '?openid=' + o.openid + '&merchant=' + req.query.merchant + '&t=' + new Date().getTime());
                                res.header('Location', config.redirectUrlMapping[+req.query.redirectUrlNo]+ '?merchant=' + req.query.merchant);
                                // redis.set('r:' + o.openid + ':b', 30);
                                return res.send(302);
                            });
                        });
                    }
                }).catch(function (err) {
                    res.send({ret: 1, message: err.message});
                })
            }
        })
    }
    return next();
}

function authorizedByMerchant(req, res, next) {
    var code = req.query.code;
    if (!code) {
        res.header('Location', wechat.getAuthorizeUrl(wechat.getRedirectUrl(req.url), 0));
        res.send(302);
    } else {
        request(wechat.getAccessTokenUrl(code), function (err, response, body) {
            if (err) throw err;
            var o = JSON.parse(body);
            if (o.openid) {
                res.setHeader('Set-Cookie', ['openid=' + o.openid + ';path="/"', 'token=' + o.access_token + ';path="/"']);
                return rewardHunterDAO.findMerchantByOpenId(o.openid).then(function (users) {
                    var redirectUrl = ((req.url.indexOf('merchant') > 0) ? config.wechat.merchantPage : config.wechat.withdrawPage) + '?open=' + o.openid;
                    res.header('Location', redirectUrl);
                    return res.send(302);
                }).catch(function (err) {
                    res.send({ret: 1, message: err.message});
                })
            }
        })
    }
    return next();
}


module.exports = {
    callback: function (req, res, next) {
        authorizedBy(req, res, next);
        return next();
    },

    callbackMerchant: function (req, res, next) {
        authorizedByMerchant(req, res, next);
        return next();
    }
}