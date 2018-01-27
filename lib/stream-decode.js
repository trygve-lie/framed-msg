'use strict';

const stream = require('stream');

const FramedMsgDecodeStream = class FramedMsgDecodeStream extends stream.Transform {
    constructor(args) {
        super(Object.assign({
            readableObjectMode: true
        }, args));

        // Number of arguments in the message
        Object.defineProperty(this, 'argc', {
            value: 0,
            writable: true,
        });

        // Length of the current argument being
        // extracted from the message
        Object.defineProperty(this, 'argl', {
            value: 0,
            writable: true,
        });

        // Collected arguments in a message
        Object.defineProperty(this, 'argv', {
            value: [],
            writable: true,
        });

        // Offset from beginning of a chunk to
        // where we are reading
        Object.defineProperty(this, 'off', {
            value: 0,
            writable: true,
        });

        // Buffer to collect chunks when a message are
        // spread over multiple stream chunks
        Object.defineProperty(this, 'bufv', {
            value: [],
            writable: true,
        });

        // Length of each buffer collected when a message
        // are spread over multipe stream chunks
        Object.defineProperty(this, 'bufl', {
            value: 0,
            writable: true,
        });

        // Which step we are in in the parsing process
        Object.defineProperty(this, 'step', {
            value: 'head',
            writable: true,
        });
    }

    get [Symbol.toStringTag]() {
        return 'FramedMsgDecodeStream';
    }

    _transform(chunk, encoding, next) {
        const length = chunk.length;

        if (this.step !== 'buf' && length < 5) {
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
                this.step = 'frame';
            }

            // Read frame and get size of following argument
            if (this.step === 'frame') {
                this.argl = chunk.readUInt32BE(this.off);
                this.off += 4;
                this.step = 'arg';
            }

            // Get argument
            if (this.step === 'arg' && (length - this.off) >= this.argl) {
                // whole argument is within chunk
                // we can extract the whole argument from this chunk
                this.argv.push(chunk.slice(this.off, this.off += this.argl));
                this.argc--;

                this.step = 'frame';

            } else if (this.step === 'buf' && (length - this.off) >= this.argl) {
                // part of argument is within chunk
                // we have buffered up the whole argument
                const chnk = chunk.slice(this.off, this.off += this.argl);
                this.bufv.push(chnk);
                this.bufl += chnk.length;

                this.argv.push(Buffer.concat(this.bufv, this.bufl));
                this.argc--;

                this.bufv = [];
                this.bufl = 0;
                this.step = 'frame';

            } else {
                // the argument is larger then the chunk
                // we need to buffer up the rest of the argument
                const chnk = chunk.slice(this.off, length);
                this.bufv.push(chnk);
                this.bufl += chnk.length;

                this.argl -= length - this.off;

                this.off = length;
                this.step = 'buf';
            }

            // At end of stream chunk
            if (this.off === length) {
                this.off = 0;
                c = false;
            }

            // At end of message
            if (this.argc === 0) {
                this.push(this.argv);

                this.argc = 0;
                this.argl = 0;
                this.argv = [];
                this.step = 'head';
            }
        } while (c);

        return next();
    }
};

module.exports = FramedMsgDecodeStream;
