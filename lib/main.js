'use strict';

const stream = require('stream');

const FramedMsg = class FramedMsg extends stream.Writable {
    constructor(...args) {
        super(...args);

        this.argc = 0; // number of arguments in the message
        this.argl = 0; // length of the current argument being extracted from the message
        this.argv = []; // the arguments in a message
        this.off = 0; // offset from the beginning of the message to where we are reading something

        // buffer to collect chunks when a message are spread over multiple stream chunks
        this.bufv = [];
        this.bufl = 0;

        this.step = 'head';
    }

    get [Symbol.toStringTag]() {
        return 'FramedMsg';
    }

    _zero() {
        this.argc = 0;
        this.argl = 0;
        this.off = 0;
        this.argv = [];
        this.bufv = [];
        this.step = 'head';
    }

    _write(chunk, encoding, next) {
        if (this.step !== 'buf' && chunk.length < 5) {
            this.emit('error', new RangeError('Chunk is too small. Can not be a proper framed message.'));
            return next();
        }

        // TODO: Add safe guard so do-while does not loop longer than maximum
        // of arguments we allow in a message...
        let c = true;
        do {
            // Get amount of arguments in message
            if (this.step === 'head') {
                this.argc = chunk.readInt8(0);
                this.off += 1;
                this.step = 'size';
            }

            // Get size of following argument
            if (this.step === 'size') {
                this.argl = chunk.readUInt32BE(this.off);
                this.off += 4;
                this.step = 'arg';
            }

            // Get argument
            if (this.step === 'arg' && (chunk.length - this.off) >= this.argl) {
                // whole argument is within chunk
                // we can extract the whole argument from this chunk
                this.argv.push(chunk.slice(this.off, this.off += this.argl));
                c = this.argv.length !== this.argc;
                this.step = 'size';

            } else if (this.step === 'buf' && (chunk.length - this.off) >= this.argl) {
                // part of argument is within chunk
                // we have buffered up the whole argument
                const chnk = chunk.slice(this.off, this.off += this.argl);
                this.bufv.push(chnk);
                this.bufl += chnk.length;

                this.argv.push(Buffer.concat(this.bufv, this.bufl));

                this.bufv = [];
                this.bufl = 0;
                c = this.argv.length !== this.argc;
                this.step = 'size';

            } else {
                // the argument is larger then the chunk
                // we need to buffer up the rest of the argument
                const chnk = chunk.slice(this.off, chunk.length);
                this.bufv.push(chnk);
                this.bufl += chnk.length;

                this.argl -= chunk.length - this.off;
                this.off = 0;
                c = false;
                this.step = 'buf';

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
        // TODO: add minimum length check. throw if too small

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
