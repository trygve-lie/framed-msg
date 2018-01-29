'use strict';

const stream = require('stream');
const encode = require('./encode');

const FramedMsgEncodeStream = class FramedMsgEncodeStream extends stream.Transform {
    constructor(args) {
        super(Object.assign({
            writableObjectMode: true
        }, args));
    }

    get [Symbol.toStringTag]() {
        return 'FramedMsgEncodeStream';
    }

    _transform(chunk, encoding, next) {
        const buf = encode(chunk);
        this.push(buf);
        next();
    }
};

module.exports = FramedMsgEncodeStream;
