'use strict';

const stream = require('stream');

const FramedMsg = class FramedMsg extends stream.Writable {
    constructor(...args) {
        super(...args);

        this.argc = 0;
        this.len = 0;
        this.off = 0;
        this.index = 0;
        this.argv = [];
    }

    get [Symbol.toStringTag]() {
        return 'FramedMsg';
    }

    zero() {
        this.argc = 0;
        this.len = 0;
        this.off = 0;
        this.index = 0;
        this.argv = [];
    }

    _write(chunk, encoding, next) {
        do {
            if (this.argc === 0) {
                this.argc = chunk.readInt8(0);
                this.off += 1;
            }

            this.len = chunk.readUInt32BE(this.off);
            this.off += 4;

            this.argv[this.index] = chunk.slice(this.off, this.off += this.len);
            this.index++;

        } while (this.index !== this.argc);

        this.emit('data', this.argv);
        this.zero();
        next();
    }

    static encode(args = []) {
        let argc = 1;
        let off = 0;

        // Calculate total length of message buffer
        if (args.length !== 0) {
            argc += args.map((arg) => {
                return arg.length + 4;
            }).reduce((pre, cur) => {
                return pre + cur;
            });
        }

        // Create message buffer
        const buf = Buffer.alloc(argc);

        // Set amount of arguments to expect
        buf.writeInt8(args.length, off);
        off += 1;

        // Set each argument length followed by its argument
        args.forEach((arg, index, arr) => {
            buf.writeUInt32BE(arr[index].length, off);
            arr[index].copy(buf, off += 4);
            off += arr[index].length;
        });

        return buf;
    }

    static decode(buf) {
        const argv = [];
        let len = 0;
        let off = 0;

        // Get amount of arguments to expect
        const argc = buf.readInt8(0);
        off += 1;

        // Get each argument
        for (let i = 0; i < argc; i++) {
            len = buf.readUInt32BE(off);
            off += 4;
            argv[i] = buf.slice(off, off += len);
        }

        return argv;
    }
};

module.exports = FramedMsg;
