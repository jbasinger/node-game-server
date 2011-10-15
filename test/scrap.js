var crypto = require('crypto');
var sys = require('sys');

var shasum = crypto.createHash('sha1');

shasum.update('password');

var d = shasum.digest('hex');
console.log(d);