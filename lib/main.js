'use strict';

const stream = require('stream');

const FramedMsg = class FramedMsg extends stream.Writable {
    constructor(...args) {
        super(...args);

        this.argc = 0; // number of arguments in the message
        this.len = 0; // length of the current argument being extracted from the message
        this.off = 0; // offset from the beginning of the message to where we are reading something
        this.argv = []; // the arguments in a message

        // buffer to collect chunks when a message are spread over multiple stream chunks
        this.chunks = [];
        this.part = 'head';
    }

    get [Symbol.toStringTag]() {
        return 'FramedMsg';
    }

    _zero() {
        this.argc = 0;
        this.len = 0;
        this.off = 0;
        this.argv = [];
        this.chunks = [];
        this.part = 'head';
    }

    _write(chunk, encoding, next) {
        if (this.part !== 'buf' && chunk.length < 5) {
            this.emit('error', new RangeError('Chunk is too small. Can not be a proper framed message.'));
            return next();
        }

// TODO: Add safe guard so do-while does not loop longer than maximum of arguments we allow in a message...
        let c = true;
        do {
            // Get amount of arguments in message
            if (this.part === 'head') {
                this.argc = chunk.readInt8(0);
                this.off += 1;
                this.part = 'size';
            }

            // Get size of following argument
            if (this.part === 'size') {
                this.len = chunk.readUInt32BE(this.off);
                this.off += 4;
                this.part = 'arg';
            }

            // Get argument
            if (this.part === 'arg' && (chunk.length - this.off) >= this.len) {
                // whole argument is within chunk
                // we can extract the whole argument from this chunk
                this.argv.push(chunk.slice(this.off, this.off += this.len));
                c = this.argv.length !== this.argc;
                this.part = 'size';
            } else if (this.part === 'buf' && (chunk.length - this.off) >= this.len) {
                // part of argument is within chunk
                // we have buffered up the whole argument
                this.chunks.push(chunk.slice(this.off, this.off += this.len));
                this.argv.push(Buffer.concat(this.chunks)); // TODO: keep track of length
                this.chunks = [];
                c = this.argv.length !== this.argc;
                this.part = 'size';
            } else {
                // the argument is larger then the chunk
                // we need to buffer up the rest of the argument
                this.chunks.push(chunk.slice(this.off, chunk.length));
                this.len -= chunk.length - this.off;
                this.off = 0;
                c = false;
                this.part = 'buf';
            }

            // At end of message
            if (this.argv.length === this.argc) {
                this.emit('data', this.argv);
                this._zero();
            }
        } while (c);

        return next();
    }

    static encode(args = []) {
        // TODO: args can not be longer then 127. throw if so

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
        const buf = Buffer.allocUnsafe(argc);

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
