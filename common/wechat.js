var config = require('../config');
var crypto = require('crypto');
var request = require('request');
var _ = require('lodash');
var redis = require('../common/redisClient');
var qiniu = require('../common/qiniu');
var cookieParser = require('../common/cookieParser');
var rewardHunterDAO = require('../dao/rewardHunterDAO');
var xmljs = require('xml2js');
var fs = require('fs')
    , path = require('path')
    , certFile = path.resolve(__dirname, '../cert/apiclient_cert.pem')
    , keyFile = path.resolve(__dirname, '../cert/apiclient_key.pem')
    , caFile = path.resolve(__dirname, '../cert/rootca.pem');
var moment = require('moment');
function getClientIp(req) {
    return req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;
}

function raw1(args) {
    var keys = Object.keys(args);
    keys = keys.sort()
    var newArgs = {};
    keys.forEach(function (key) {
        newArgs[key] = args[key];
    });
    var string = '';
    for (var k in newArgs) {
        string += '&' + k + '=' + newArgs[k];
    }
    string = string.substr(1);
    return string;
}
function paySignJSAPI(ret) {
    var string = raw1(ret);
    var key = config.wechat.paymentKey;
    string = string + '&key=' + key;
    return crypto.createHash('md5').update(string, 'utf8').digest('hex');
}
function paySignJS(appid, nonceStr, packageName, signType, timeStamp) {
    var ret = {
        appId: appid,
        nonceStr: nonceStr,
        package: packageName,
        signType: signType,
        timeStamp: timeStamp
    };
    var string = raw1(ret);
    var key = config.wechat.paymentKey;
    string = string + '&key=' + key;
    console.log(string);
    var crypto = require('crypto');
    return crypto.createHash('md5').update(string, 'utf8').digest('hex');
};
module.exports = {
    sign: function () {
        return function (req, res, next) {
            var signature = req.query.signature;
            var timestamp = req.query.timestamp;
            var nonce = req.query.nonce;
            var shasum = crypto.createHash('sha1');
            var arr = [config.wechat.token, timestamp, nonce].sort();
            shasum.update(arr.join(''));
            var result = shasum.digest('hex') === signature;
            console.log(result);
            return res.send(result ? req.query.echostr + '' : 'err');
            // return next();
        }
    },
    getRefreshTokenUrl: function (refreshToken) {
        return config.wechat.getRefreshTokenUrl.replace('REFRESH_TOKEN', refreshToken);
    },
    getAccessToken: function (callback) {
        redis.getAsync('ak:token').then(function (reply) {
            if (reply) {
                return callback(null, reply);
            } else {
                var accessTokenUrl = _.cloneDeep(config.wechat.accessTokenUrl);
                var url = accessTokenUrl.replace('APPID', config.wechat.appid).replace('APPSECRET', config.wechat.appsecret);
                request(url, function (error, response, body) {
                    if (error) throw error;
                    if (!error && response.statusCode == 200) {
                        var result = JSON.parse(body);
                        redis.setAsync('ak:token', result.access_token);
                        redis.expireAsync('ak:token', 7200);
                        return callback(error, result.access_token);
                    }
                })
            }
        }).catch(function (err) {
            callback(err, null);
        })
    },
    getVerifyAccessTokenUrl: function (accessToken, openid) {
        return config.wechat.getVerifyAccessTokenUrl.replace('ACCESS_TOKEN', accessToken)
            .replace('OPENID', openid);
    },
    getAuthorizeUrl: function getAuthorizeUrl(redirectUrl, state) {
        var t = config.wechat.authorizeUrlTemplate;
        return t.replace('REDIRECT_URI', redirectUrl).replace('STATE', state);
    },
    getRedirectUrl: function (path) {
        return encodeURIComponent(['http://', 'mp.ceylonstone.com.cn', path].join(''))
    },
    getAccessTokenUrl: function (code) {
        return config.wechat.accessTokenUrlTemplateByPage.replace('CODE', code);
    },
    openidRefreshTokenKey: function (openId) {
        return ['openid', openId, 'refresh_token'].join(':');
    },
    downloadUrl: function (accessToken, mediaId) {
        return config.wechat.downloadUrl.replace('ACCESS_TOKEN', accessToken).replace("MEDIA_ID", mediaId);
    },
    toBase64: function (str) {
        return new Buffer(str).toString('base64')
            .replace(/\//g, '_')
            .replace(/\+/g, '-');
    },

    sync: function (image, callback) {
        var that = this;
        that.getAccessToken(function (err, token) {
            if (err) throw err;
            var fileName = qiniu.getFileName(image);
            var path = qiniu.getFetchPath(that.toBase64(that.downloadUrl(token, image)),
                that.toBase64('hisforce:' + fileName));
            var managementToken = qiniu.getManagementToken(path);
            var options = {
                url: 'http://iovip.qbox.me' + path,
                'Content-Type': 'application/x-www-form-urlencoded',
                headers: {
                    'Authorization': 'QBox ' + managementToken
                }
            };
            request.post(options, function (err, response, body) {
                callback(err, config.qiniu.prefix + fileName);
            });
        });
    },

    createTextMessage: function (body) {
        var time = Math.round(new Date().getTime() / 1000);
        return "" +
            "<xml>" +
            "<ToUserName><![CDATA[" + body.from + "]]></ToUserName>" +
            "<FromUserName><![CDATA[" + body.to + "]]></FromUserName>" +
            "<CreateTime>" + time + "</CreateTime>" +
            "<MsgType><![CDATA[" + "text" + "]]></MsgType>" +
            "<Content><![CDATA[" + body.message + "]]></Content>" +
            "<FuncFlag>" + "0" + "</FuncFlag>" +
            "</xml>";
    },
    getUserInfoUrl: function (accessToken, openid) {
        return config.wechat.getUserInfoUrlTemplate.replace('ACCESS_TOKEN', accessToken)
            .replace('OPENID', openid);
    },
    sendMessage: function (toUserName, message) {
        var that = this;
        that.getAccessToken(function (err, accessToken) {
            if (err) throw err;
            var options = {
                url: 'https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=' + accessToken,
                body: JSON.stringify({
                    touser: toUserName, msgtype: 'text', 'text': {'content': message}
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            request.post(options, function (err, response, body) {
                if (err) throw err;
            });
        });
    },
    jsAPIPay: function (req, res, callback) {
        var appid = config.wechat.appid;
        var attach = config.wechat.paymentAttach;
        var mch_id = config.wechat.merchant_id;
        var nonce_str = Math.random().toString(36).substr(2, 15);
        var notify_url = config.wechat.notify_url;
        var body = config.wechat.paymentBody;
        var clientIP = getClientIp(req);
        var timeStamp = parseInt(new Date().getTime() / 1000) + '';
        var formData = "<xml>";
        formData += "<appid>" + appid + "</appid>";
        formData += "<attach>" + attach + "</attach>";
        formData += "<body>" + body + "</body>";
        formData += "<mch_id>" + mch_id + "</mch_id>";
        formData += "<nonce_str>" + nonce_str + "</nonce_str>";
        formData += "<notify_url>" + notify_url + "</notify_url>";
        formData += "<openid>" + req.body.openid + "</openid>";
        formData += "<out_trade_no>" + req.body.orderNo + "</out_trade_no>";
        formData += "<spbill_create_ip>" + clientIP + "</spbill_create_ip>";
        formData += "<total_fee>" + req.body.amount + "</total_fee>";
        formData += "<trade_type>JSAPI</trade_type>";
        formData += "<sign>" + paySignJSAPI({
                appid: appid,
                attach: attach,
                body: body,
                mch_id: mch_id,
                nonce_str: nonce_str,
                notify_url: notify_url,
                openid: req.body.openid,
                out_trade_no: req.body.orderNo,
                spbill_create_ip: clientIP,
                total_fee: req.body.amount,
                trade_type: 'JSAPI'
            }) + "</sign>";
        formData += "</xml>";
        request({
            url: config.wechat.paymentCreateOrder,
            method: 'POST',
            body: formData
        }, function (err, response, body) {
            xmljs.parseString(body.toString("utf-8"), {explicitArray: false}, function (err, result) {
                if (result.xml && result.xml.err_code_des) return callback(new Error(result.xml.err_code_des), null);
                var paySign = paySignJS(appid, nonce_str, 'prepay_id=' + result.xml.prepay_id, 'MD5', timeStamp);
                callback(err, {
                    prepay_id: 'prepay_id=' + result.xml.prepay_id,
                    paySignJS: paySign,
                    appid: appid,
                    timeStamp: timeStamp,
                    nonce_str: nonce_str
                });
            });
        });
    },

    withdraw: function (req, res, callback) {
        var appid = config.wechat.appid;
        var mch_id = config.wechat.merchant_id;
        var nonce_str = Math.random().toString(36).substr(2, 15);
        var amount = req.body.amount;
        var openid = req.body.openid;
        var clientIP = getClientIp(req);
        var timeStamp = parseInt(new Date().getTime() / 1000) + '';
        var url = "https://api.mch.weixin.qq.com/mmpaymkttransfers/promotion/transfers";
        redis.incrAsync('pay:t:order:incr').then(function (reply) {
            var orderNo = req.body.orderPrefix + moment().format('YYYYMMDD') + req.body.sequence + _.padLeft(+reply, 4, '0');
            var formData = "<xml>";
            formData += "<mch_appid>" + appid + "</mch_appid>";
            formData += "<mchid>" + mch_id + "</mchid>";
            formData += "<nonce_str>" + nonce_str + "</nonce_str>";
            formData += "<openid>" + openid + "</openid>";
            formData += "<re_user_name>" + req.body.realName + "</re_user_name>";
            formData += "<partner_trade_no>" + orderNo + "</partner_trade_no>";
            formData += "<spbill_create_ip>" + clientIP + "</spbill_create_ip>";
            formData += "<amount>" + amount + "</amount>";
            formData += "<check_name>NO_CHECK</check_name>";
            formData += "<desc>" + req.body.desc + "</desc>";
            formData += "<sign>" + paySignJSAPI({
                    mch_appid: appid,
                    mchid: mch_id,
                    nonce_str: nonce_str,
                    openid: openid,
                    partner_trade_no: orderNo,
                    spbill_create_ip: clientIP,
                    amount: amount,
                    check_name: 'NO_CHECK',
                    re_user_name: req.body.realName,
                    desc: req.body.desc
                }) + "</sign>";
            formData += "</xml>";
            request({
                url: url, method: 'POST', body: formData,
                cert: fs.readFileSync(certFile),
                key: fs.readFileSync(keyFile),
                ca: fs.readFileSync(caFile)
            }, function (err, response, body) {
                xmljs.parseString(body.toString("utf-8"), {explicitArray: false}, function (err, result) {
                    var r = result.xml;
                    if (r && r.err_code_des) return callback(new Error(r.err_code_des), response, body);
                    callback(err, response, body);
                });
            })
        });
    },
    lockAccount: function (req, res, next) {
        var cookies = cookieParser(req);
        if (cookies['openid'] && cookies['openid'] != 'undefined') {
            rewardHunterDAO.findPlayerStatus(cookies['openid']).then(function (result) {
                if (result && result.length > 0 && result[0].status == 1) return res.send({ret: 2, message: '用户已禁用。'})
            });
        }
    }
}