"use strict";
var config = require('../config');
var Promise = require('bluebird');
var request = Promise.promisifyAll(require('request'));
var _ = require('lodash');
var redis = require('../common/redisClient');
var i18n = require('../i18n/localeMessage');
var qiniu = require('qiniu');
var util = require('util');
var moment = require('moment');
module.exports = {
    sendSMS: function (req, res, next) {
        var smsConfig = config.sms;
        var code = _.random(1000, 9999);
        var content = smsConfig.template.replace(':code', code);
        var option = {mobile: req.params.mobile, text: content, apikey: config.sms.apikey};
        request.postAsync({url: smsConfig.providerUrl, form: option}).then(function (response, body) {
            console.log(response);
        }).then(function () {
            return redis.set(option.mobile, code);
        }).then(function () {
            return redis.expireAsync(option.mobile, smsConfig.expireTime);
        }).then(function (reply) {
            res.send({ret: 0, message: i18n.get('sms.send.success')});
        });
        return next();
    },
    getQiniuToken: function (req, res, next) {
        qiniu.conf.ACCESS_KEY = '0d02DpW7tBPiN3TuZYV7WcxmN1C9aCiNZeW9fp5W';
        qiniu.conf.SECRET_KEY = '7zD3aC6xpvp_DfDZ0LJhjMq6n6nB6UVDbl37C5FZ';
        var bucket = 'hisforce';
        var putPolicy = new qiniu.rs.PutPolicy(bucket);
        putPolicy.expires = 3600;
        res.send({
            ret: 0, data: {
                token: putPolicy.token()
            }
        });
        return next();
    },
    getUserAgreement: function (req, res, next) {
        res.redirect(config.app.userAgreementUrl, next);
    },
    saveVersionInfo: function (req, res, next) {
        redis.setAsync('appid:' + req.params.appid, JSON.stringify(req.body)).then(function (reply) {
            res.send({ret: 0, message: '版本信息上传成功。'});
        });
        return next();
    },

    getVersionInfo: function (req, res, next) {
        res.send({ret: 0, data: config.versionInfo});
        return next();
    },
    getVersionInfoByAppId: function (req, res, next) {
        redis.getAsync('appid:' + req.params.appid).then(function (data) {
            res.send({ret: 0, data: JSON.parse(data)});
        });
        return next();
    },
    postTraffic: function (req, res, next) {
        var option = {mobile: req.params.mobile, sn: '1008605', apikey: config.sms.apikey};
        request.postAsync({
            url: 'https://flow.yunpian.com/v2/flow/recharge.json',
            form: option
        }).then(function (response, body) {
            res.send({ret: 0, data: response})
        });
        return next();
    }
}