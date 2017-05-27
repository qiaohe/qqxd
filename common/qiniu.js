/**
 * Created by Johnson on 2015/9/3.
 */
var crypto = require('crypto');
var config = require('../config');

module.exports = {
    getManagementToken: function (path) {
        var signature = crypto.createHmac('sha1', config.qiniu.sk).update(path + '\n').digest('base64');
        var s = signature.replace(/\//g, '_').replace(/\+/g, '-');
        return config.qiniu.ak + ':' + s;
    },
    
    getFetchPath: function (encodedURL, encodedEntryURI) {
        return ['/fetch/', encodedURL, '/to/', encodedEntryURI].join('');
    },
    
    getFileName: function (item) {
        return item + '.jpg';
    }
};
