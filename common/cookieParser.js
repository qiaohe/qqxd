/**
 * Created by Johnson on 2015/8/14.
 */
module.exports = function (request) {
    var cookies = {},
        rc = request.headers.cookie;
    rc && rc.split(';').forEach(function (cookie) {
        var parts = cookie.split('=');
        cookies[parts.shift().trim()] = decodeURI(parts.join('='));
    });
    return cookies;
}