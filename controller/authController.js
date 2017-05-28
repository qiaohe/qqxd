"use strict";
var md5 = require('md5');
var redis = require('../common/redisClient');
var config = require('../config');
var crypto = require('crypto');
var rewardHunterDAO = require('../dao/rewardHunterDAO');
var i18n = require('../i18n/localeMessage');
var _ = require('lodash');
var moment = require('moment');
var uuid = require('node-uuid');
var xmljs = require('xml2js');
var parser = new xmljs.Parser();
var request = require('request');
var wechat = require('../common/wechat');
module.exports = {
    login: function (req, res, next) {
        var userName = (req.body && req.body.username) || (req.query && req.query.username);
        var password = (req.body && req.body.password) || (req.query && req.query.password);
        var user = {};
        rewardHunterDAO.findByUserName(userName).then(function (users) {
            if (!users || !users.length) throw new Error(i18n.get('member.not.exists'));
            user = users[0];
            if (user.status == 1) throw new Error(i18n.get('member.resign.error'));
            if (user.password != md5(password)) throw new Error(i18n.get('member.password.error'));
            var token = uuid.v4();
            redis.set(token, JSON.stringify(user));
            redis.expire(token, config.app.tokenExpire);
            user.token = token;
            delete user.password;
            redis.getAsync('uid:' + user.id + ':token').then(function (reply) {
                redis.del(reply);
                redis.set('uid:' + user.id + ':token', token);
            });
            res.send({ret: 0, data: user});
        }).catch(function (err) {
            res.send({ret: 1, message: err.message});
        });
        return next();
    },

    logout: function (req, res, next) {
        var token = req.headers['token'];
        if (!token) return res.send(401, i18n.get('token.not.provided'));
        redis.delAsync(token).then(function () {
            redis.del('uid:' + req.user.id + ':token');
            res.send({ret: 0, message: i18n.get('logout.success')});
        }).catch(function (err) {
            res.send({ret: 1, message: err.message});
        });
        return next();
    },

    checkSignature: function (req, res, next) {
        res.end(req.query.echostr);
        return next();
    },

    wechatCallback: function (req, res, next) {
        parser.parseString(req.body, function (err, result) {
            if (err) throw err;
            var body = result.xml;
            var messageType = body.MsgType[0];
            if (messageType === 'event') {
                var eventName = body.Event[0];
                if (eventName == 'subscribe') {
                    var openId = body.FromUserName[0];
                    wechat.getAccessToken(function (err, token) {
                        var url = config.wechat.getUserInfo.replace('ACCESS_TOKEN', token).replace("OPENID", openId);
                        request(url, function (err, response, data) {
                            if (err) throw err;
                            var wechatUser = JSON.parse(data);
                            delete wechatUser.subscribe;
                            delete wechatUser.tagid_list;
                            delete wechatUser.groupid;
                            delete wechatUser.remark;
                            wechatUser.sex = (wechatUser.sex == 1 ? 1 : 0);
                            rewardHunterDAO.findMerchantByOpenId(wechatUser.openid).then(function (result) {
                                if (result && result.length < 1) rewardHunterDAO.insertMerchant(wechatUser).then(function (result) {
                                });
                            })
                        })
                    });
                    res.send(wechat.createTextMessage({
                        from: body.FromUserName[0],
                        to: body.ToUserName[0],
                        message: config.wechat.subscribeMessage.replace('OPENID', body.FromUserName[0])
                    }));
                } else if (body.EventKey && body.EventKey.length > 0 && body.Event[0] == 'VIEW') {
                    rewardHunterDAO.findMerchantByOpenId(body.FromUserName[0]).then(function (result) {
                        if (result && result.length > 0 && result[0].name) {
                            res.send(wechat.createTextMessage({
                                from: body.FromUserName[0],
                                to: body.ToUserName[0],
                                message: '你已注册奇趣小店。'
                            }))
                        }
                    })
                }
            }
        });
        return next();
    },

    createMenu: function (req, res, next) {
        wechat.getAccessToken(function (err, token) {
            if (err) throw err;
            var options = {
                url: config.wechat.createMenu.replace('ACCESS_TOKEN', token),
                method: 'POST',
                json: true,
                body: req.body
            };
            request(options, function (error, response, data) {
                if (error) throw error;
                if (response.statusCode == 200) {
                    res.send('success')
                }
            })
        });
        return next();
    },

    getSignature: function (req, res, next) {
        var ticketUrl = _.cloneDeep(config.wechat.ticketUrl);
        var timestamp = Math.floor(Date.now() / 1000);
        var sha1 = crypto.createHash('sha1');
        wechat.getAccessToken(function (err, token) {
            request(ticketUrl.replace('TOKEN', token), function (err, ressponse, json) {
                if (err) throw err;
                var ticket = JSON.parse(json);
                redis.setAsync('jssdk:ticket', ticket.ticket);
                redis.expireAsync('jssdk:ticket', 1000 * 60 * 60 * 24);
                res.send({
                    ret: 0, signature: {
                        noncestr: config.wechat.noncestr,
                        timestamp: timestamp,
                        url: req.query.url,
                        jsapi_ticket: ticket.ticket,
                        signature: sha1.update('jsapi_ticket=' + ticket.ticket + '&noncestr=' + config.wechat.noncestr + '&timestamp=' + timestamp + '&url=' + req.query.url).digest('hex')
                    }
                });
            })
        });
        return next();
    }
}
