'use strict';

const encode = require('./encode');
const decode = require('./decode');
const DecodeStream = require('./stream-decode');

module.exports.encode = encode;
module.exports.decode = decode;
module.exports.DecodeStream = DecodeStream;
