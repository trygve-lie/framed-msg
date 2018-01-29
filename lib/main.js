'use strict';

const encode = require('./encode');
const decode = require('./decode');
const EncodeStream = require('./stream-encode');
const DecodeStream = require('./stream-decode');

module.exports.encode = encode;
module.exports.decode = decode;
module.exports.EncodeStream = EncodeStream;
module.exports.DecodeStream = DecodeStream;
