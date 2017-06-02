'use strict';

module.exports = {
    server: {
        name: 'Reward Hunter app restful api',
        version: '0.0.1',
        host: '0.0.0.0',
        port: 3000
    },
    staticDirectory: {
        directory: '/opt/fabulousShop',
        default: 'index.html',
        maxAge: 1
    },
    multipleStatements: true, db: {
        host: '116.62.208.62',
        port: '3306',
        user: 'root',
        password: 'heqiao75518?',
        debug: false,
        dateStrings: true,
        database: 'FabulousShop',
        charset: 'UTF8MB4_GENERAL_CI'
    },
    app: {
        locale: 'zh_CN',
        tokenSecret: '1~a',
        tokenExpire: 8640000,
        dateStrings: 'true',
        defaultHeadPic: 'http://7xrtp2.com2.z0.glb.qiniucdn.com/headPic.png',
        userAgreementUrl: 'http://7xrtp2.com2.z0.glb.qiniucdn.com/hisbusiness/user_protocol.html'
    },
    redis: {
        host: '127.0.0.1',
        port: 6379
    },
    wechat: {
        token: 'sunny',
        appid: 'wxb9f33badcb4fbd68',
        merchant_id: '1444211902',
        paymentKey: 'QUQIxiaodianYIDINGhuigenghaoWang',
        paymentAttach: '奇趣小店',
        paymentBody: '奇趣小店-茶包',
        subscribeMessage: "您好，欢迎您关注奇趣小店!",
        notify_url: 'http://mp.ceylonstone.com.cn/api/payment/callback',
        expire_seconds_qrCode: 315360000,
        merchantPage: 'http://mp.ceylonstone.com.cn/register.html',
        withdrawPage: 'http://mp.ceylonstone.com.cn/withdrawCash.html',
        appsecret: '1d0f09f125324a23ce749a9adf79ae7e',
        accessTokenUrl: 'https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=APPID&secret=APPSECRET',
        createMenu: 'https://api.weixin.qq.com/cgi-bin/menu/create?access_token=ACCESS_TOKEN',
        getUserInfo: 'https://api.weixin.qq.com/cgi-bin/user/info?access_token=ACCESS_TOKEN&openid=OPENID&lang=zh_CN',
        getUserInfoUrlTemplate: "https://api.weixin.qq.com/sns/userinfo?access_token=ACCESS_TOKEN&openid=OPENID&lang=zh_CN",
        createQrCode: 'https://api.weixin.qq.com/cgi-bin/qrcode/create?access_token=TOKEN',
        ticketUrl: 'https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=TOKEN&type=jsapi',
        authorizeUrlTemplate: "https://open.weixin.qq.com/connect/oauth2/authorize?appid=wxb9f33badcb4fbd68&redirect_uri=REDIRECT_URI&response_type=code&scope=snsapi_userinfo&state=STATE#wechat_redirect",
        accessTokenUrlTemplateByPage: "https://api.weixin.qq.com/sns/oauth2/access_token?appid=wxb9f33badcb4fbd68&secret=1d0f09f125324a23ce749a9adf79ae7e&code=CODE&grant_type=authorization_code",
        noncestr: 'xmyD!@001ync',
        playerWithdrawDesc: '奇趣小店礼品',
        merchantWithdrawDesc: '活动奖金',
        paymentCreateOrder: 'https://api.mch.weixin.qq.com/pay/unifiedorder',
        downloadUrl: "http://file.api.weixin.qq.com/cgi-bin/media/get?access_token=ACCESS_TOKEN&media_id=MEDIA_ID",
        getRefreshTokenUrl: "https://api.weixin.qq.com/sns/oauth2/refresh_token?appid=wxb9f33badcb4fbd68&grant_type=refresh_token&refresh_token=REFRESH_TOKEN",
        getAccessTokenUrl: "https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=wxb9f33badcb4fbd68&secret=1d0f09f125324a23ce749a9adf79ae7e"
    },
    qiniu: {
        ak: "uUGqn-e4Gyz2v2LaMIq1Dzes-YsGCh1_RaQ8_U2U",
        sk: "xab8g9SJK_M0dQGug2GLEXFo1rZ9jOZxqjFihWhV",
        prefix: "http://oqg0qx4pu.bkt.clouddn.com/"
    },
    deliverAddressUrl: 'https://jinshuju.net/f/iaIuNl',
    complaintUrl: 'https://jinshuju.net/f/h3GjNP',
    speedSetting: {
        bulletSpeed: 100,
        bulletDelayTime: 100,
        animalRollSpeed: 100
    },
    complexRate: [0.70, 0.75, 0.80, 0.85, 0.90, 0.95],
    multipleSequence: [0.8, 2, 0.5, 5, 0.1, 10, 0.3, 1.2],
    currentComplexRate: 0.85,
    redirectUrlMapping: ['http://mp.ceylonstone.com.cn/qqxd/index.html', 'http://mp.ceylonstone.com.cn/exchangePrize.html', 'http://mp.ceylonstone.com.cn/gameBing.html', 'http://mp.ceylonstone.com.cn/withdrawCash.html']
};

