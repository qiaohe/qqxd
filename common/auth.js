"use strict";
var Promise = require('bluebird');
var jwt = Promise.promisifyAll(require("jsonwebtoken"));
var i18n = require('../i18n/localeMessage');
var config = require('../config');
var routeConfig = require('../routerConfig');
var _ = require('lodash');
var redis = require('./redisClient');
var rewardHunterDAO = require('../dao/rewardHunterDAO');
var request = require('request');
var wechat = require('../common/wechat');
var url = require('url');
var cookieParser = require('../common/cookieParser');
function authorizedIfNeeded(req) {
    var routeItem = _.findLast(routeConfig, function (item) {
        var regExp = new RegExp('^' + item.path.replace(/:[(a-zA-Z0-9)]*/g, '[\\w|-]+') + '$');
        var m = req.method.toLowerCase();
        return (m == item.method || (m == 'delete' && item.method == 'del')) && regExp.test(url.parse(req.url).pathname)
    });
    return routeItem && routeItem.secured && routeItem.secured == 'user';
}

function auth() {
    function ensureAuthorized(req, res, next) {
        // if (!authorizedIfNeeded(req)) return next();
        var cookies =  cookieParser(req);
        // var ignoredPaths = ['/api/enquiries', '/favicon.ico', '/api/wechat/signature'];
        // var ignoredPathsPattern = /^\S*(css|png|js|html|ttf|woff|svg|eot|scss)/;
        // var pathname = url.parse(req.url).pathname;
        if (cookies['openid'] == 'undefined') {
            cookies['openid'] = undefined;
        }
        if (!(cookies['openid'] && cookies['merchant']) && req.url.indexOf('/qqxd/index.html') > -1) {
            var code = req.query.code;
            var url = req.url.replace("&from=singlemessage&isappinstalled=0", '');
            if (!code) {
                res.header('Location', wechat.getAuthorizeUrl(wechat.getRedirectUrl(url), 0));
                res.send(302);
            } else {
                request(wechat.getAccessTokenUrl(code), function (err, response, body) {
                    if (err) throw err;
                    var o = JSON.parse(body);
                    if (o.openid && req.query.merchant) {
                        res.setHeader('Set-Cookie', ['openid=' + o.openid+';path="/"', 'token=' + o.access_token +';path="/"']);

                        // res.setHeader('Set-Cookie', ['openid=' + o.openid, 'merchant=' + req.query.merchant, 'token=' + o.access_token + '']);
                        return rewardHunterDAO.findByOpenId(o.openid).then(function (users) {
                            if (users.length > 0) {
                                redis.set('r:' + o.openid + ':b', users[0].coinBalance - users[0].availableCoin);
                                return next();
                            } else {
                                request(wechat.getUserInfoUrl(o.access_token, o.openid), function (err, response, body) {
                                    if (err) return res.send(403, i18n.get('access.not.authorized'));
                                    var player = JSON.parse(body);
                                    delete player.privilege;
                                    player.createDate = new Date();
                                    return rewardHunterDAO.insertPlayer(player).then(function (result) {
                                        // res.header('Location', config.redirectUrlMapping[+req.query.redirectUrlNo] + '?openid=' + o.openid + '&merchant=' + req.query.merchant + '&t=' + new Date().getTime());
                                        // res.header('Location', config.redirectUrlMapping[+req.query.redirectUrlNo] + '?merchant=' + req.query.merchant);
                                        // redis.set('r:' + o.openid + ':b', 30);
                                        return next();
                                        // return res.send(302);
                                    });
                                });
                            }
                        }).catch(function (err) {
                            res.send({ret: 1, message: err.message});
                        })
                    }
                })
            }
        } else {
            // if (cookies['openid']  && cookies['openid'] != 'undefined')
            // rewardHunterDAO.findPlayerStatus(cookies['openid']).then(function (result) {
            //     if (result && result.length > 0 && result[0].status == 1) return res.send({ret: 2, message: '用户已禁用。'})
            // });
            return next();
        }
        // return next();
    }
    return (ensureAuthorized);
}
module.exports = auth;