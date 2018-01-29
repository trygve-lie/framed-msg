'use strict';

const crypto = require('crypto');
const stream = require('stream');
const fmsg = require('../');
const tap = require('tap');

const srcObjectStream = (arr) => {
    return new stream.Readable({
        objectMode: true,
        read() {
            arr.forEach((item) => {
                this.push(item);
            });
            this.push(null);
        }
    });
};

const destObjectStream = (done) => {
    const arr = [];

    const dStream = new stream.Writable({
        objectMode: true,
        write(chunk, encoding, callback) {
            arr.push(chunk);
            callback();
        }
    });

    dStream.on('finish', () => {
        done(arr);
    });

    return dStream;
};

const LARGE_BUFFER = crypto.randomFillSync(Buffer.alloc(1048576));

/**
 * .encode()
 */

tap.test('.encode() - More than 128 arguments - should throw', (t) => {
    const arr = [];
    for (let i = 0; i < 200; i++) {
        arr.push(i.toString());
    }

    t.throws(() => {
        fmsg.encode(arr);
    }, new RangeError('Too many arguments. Protocol can not contain more then 128 arguments'));
    t.end();
});



/**
 * .encode() - .decode()
 */

tap.test('.*code() - no arguments to encoder - should decode to zero arguments', (t) => {
    const bin = fmsg.encode();
    const msg = fmsg.decode(bin);

    t.equal(msg.length, 0);
    t.end();
});

tap.test('.*code() - empty Array to encoder - should decode to zero arguments', (t) => {
    const bin = fmsg.encode([]);
    const msg = fmsg.decode(bin);

    t.equal(msg.length, 0);
    t.end();
});

tap.test('.*code() - multiple arguments to encoder - should decode into multiple arguments', (t) => {
    const bin = fmsg.encode([Buffer.from('foo'), Buffer.from('bar')]);
    const msg = fmsg.decode(bin);

    t.equal(msg.length, 2);
    t.equal(msg[0].toString(), 'foo');
    t.equal(msg[1].toString(), 'bar');
    t.end();
});

tap.test('.*code() - large buffer - should decode and decode', (t) => {
    const bin = fmsg.encode([LARGE_BUFFER]);
    const msg = fmsg.decode(bin);

    t.equal(msg.length, 1);
    t.equal(msg[0].toString('hex'), LARGE_BUFFER.toString('hex'));
    t.end();
});



/**
 * DecodeStream()
 */

tap.test('.decodeStream() - object type - should be FramedMsgDecodeStream', (t) => {
    const message = new fmsg.DecodeStream();
    t.equal(Object.prototype.toString.call(message), '[object FramedMsgDecodeStream]');
    t.end();
});

tap.test('.decodeStream() - write one messages with one argument on stream - should emit one message with one argument', (t) => {
    const msg = new fmsg.DecodeStream();
    const buf = fmsg.encode([Buffer.from('foo')]);

    msg.on('data', (message) => {
        t.equal(message.length, 1);
        t.equal(message[0].toString(), 'foo');
        t.end();
    });

    msg.write(buf);
});

tap.test('.decodeStream() - write one messages with multiple arguments on stream - should emit one message with multiple arguments', (t) => {
    const msg = new fmsg.DecodeStream();
    const buf = fmsg.encode([Buffer.from('foo'), Buffer.from('bar'), Buffer.from('xyz')]);

    msg.on('data', (message) => {
        t.equal(message.length, 3);
        t.equal(message[0].toString(), 'foo');
        t.end();
    });

    msg.write(buf);
});

tap.test('.decodeStream() - write multiple messages on stream - should emit multiple messages', (t) => {
    const msg = new fmsg.DecodeStream();

    const a = fmsg.encode([Buffer.from('foo')]);
    const b = fmsg.encode([Buffer.from('foo'), Buffer.from('bar')]);
    const c = fmsg.encode([Buffer.from('foo'), Buffer.from('bar'), Buffer.from('xyz')]);

    let n = 0;

    msg.on('data', (message) => {
        if (n === 0) {
            t.equal(message.length, 1);
            t.equal(message[0].toString(), 'foo');
            n++;
            return;
        }

        if (n === 1) {
            t.equal(message.length, 2);
            t.equal(message[0].toString(), 'foo');
            t.equal(message[1].toString(), 'bar');
            n++;
            return;
        }

        if (n === 2) {
            t.equal(message.length, 3);
            t.equal(message[0].toString(), 'foo');
            t.equal(message[1].toString(), 'bar');
            t.equal(message[2].toString(), 'xyz');
            t.end();
        }
    });

    msg.write(a);
    msg.write(b);
    msg.write(c);
});

tap.test('.decodeStream() - message holds only head and one frame, no argument - should emit empty message', (t) => {
    const msg = new fmsg.DecodeStream();
    const a = fmsg.encode([Buffer.from([])]);

    msg.on('data', (message) => {
        t.equal(message.length, 1);
        t.equal(message[0].toString(), '');
        t.end();
    });

    msg.write(a);
});

tap.test('.decodeStream() - message spreads over multiple stream chunks - should emit message event for each message', (t) => {
    const msg = new fmsg.DecodeStream();

    let n = 0;

    msg.on('data', (message) => {
        if (n === 0) {
            t.equal(message.length, 3);
            t.equal(message[0].toString(), 'a-foo');
            t.equal(message[1].toString(), 'a-bar');
            t.equal(message[2].toString(), 'a-xyz');
            n++;
            return;
        }

        if (n === 1) {
            t.equal(message.length, 3);
            t.equal(message[0].toString(), 'foo');
            t.equal(message[1].toString(), 'bar');
            t.equal(message[2].toString(), 'xyz');
            n++;
            return;
        }

        if (n === 2) {
            t.equal(message.length, 3);
            t.equal(message[0].toString(), 'c-foo');
            t.equal(message[1].toString(), 'c-bar');
            t.equal(message[2].toString(), 'c-xyz');
            t.end();
        }
    });

    const srcA = fmsg.encode([Buffer.from('a-foo'), Buffer.from('a-bar'), Buffer.from('a-xyz')]);
    const srcB = fmsg.encode([Buffer.from('foo'), Buffer.from('bar'), Buffer.from('xyz')]);
    const srcC = fmsg.encode([Buffer.from('c-foo'), Buffer.from('c-bar'), Buffer.from('c-xyz')]);

    msg.write(srcA); // full message
    msg.write(srcB.slice(0, 7)); // chunked mesage - cuts before last "o" in "foo"
    msg.write(srcB.slice(7, 13)); // chunked mesage - cuts before "a" in "bar"
    msg.write(srcB.slice(13, 20)); // chunked mesage - cuts before "y" in "xyz"
    msg.write(srcB.slice(20, srcB.length)); // chunked mesage - rest of message
    msg.write(srcC); // full message
});

tap.test('.decodeStream() - one large buffer - should emit one message', (t) => {
    const msg = new fmsg.DecodeStream();
    const a = fmsg.encode([LARGE_BUFFER]);

    msg.on('data', (message) => {
        t.equal(message.length, 1);
        t.equal(message[0].toString('hex'), LARGE_BUFFER.toString('hex'));
        t.end();
    });

    msg.write(a);
});


tap.test('.decodeStream() - multiple messages in one chunk - should emit multiple messages', (t) => {
    const msg = new fmsg.DecodeStream();

    const a = fmsg.encode([Buffer.from('a-foo'), Buffer.from('a-bar'), Buffer.from('a-xyz')]);
    const b = fmsg.encode([Buffer.from('b-foo'), Buffer.from('b-bar'), Buffer.from('b-xyz')]);
    const c = fmsg.encode([Buffer.from('c-foo'), Buffer.from('c-bar'), Buffer.from('c-xyz')]);

    let n = 0;

    msg.on('data', (message) => {
        if (n === 0) {
            t.equal(message.length, 3);
            t.equal(message[0].toString(), 'a-foo');
            t.equal(message[1].toString(), 'a-bar');
            t.equal(message[2].toString(), 'a-xyz');
            n++;
            return;
        }

        if (n === 1) {
            t.equal(message.length, 3);
            t.equal(message[0].toString(), 'b-foo');
            t.equal(message[1].toString(), 'b-bar');
            t.equal(message[2].toString(), 'b-xyz');
            n++;
            return;
        }

        if (n === 2) {
            t.equal(message.length, 3);
            t.equal(message[0].toString(), 'c-foo');
            t.equal(message[1].toString(), 'c-bar');
            t.equal(message[2].toString(), 'c-xyz');
            t.end();
        }
    });

    msg.write(Buffer.concat([a, b, c]));
});



/**
 * EncodeStream()
 */

tap.test('.encodeStream() - object type - should be FramedMsgEncodeStream', (t) => {
    const message = new fmsg.EncodeStream();
    t.equal(Object.prototype.toString.call(message), '[object FramedMsgEncodeStream]');
    t.end();
});

tap.test('.encodeStream() - stream endoce messages - should emit same messages when decoded', (t) => {
    const encode = new fmsg.EncodeStream();
    const decode = new fmsg.DecodeStream();

    const from = srcObjectStream([
        [Buffer.from('a-foo'), Buffer.from('a-bar'), Buffer.from('a-xyz')],
        [Buffer.from('b-foo'), Buffer.from('b-bar'), Buffer.from('b-xyz')],
        [Buffer.from('c-foo'), Buffer.from('c-bar'), Buffer.from('c-xyz')],
    ]);

    const to = destObjectStream((arr) => {
        t.equal(arr[0][0].toString(), 'a-foo');
        t.equal(arr[0][1].toString(), 'a-bar');
        t.equal(arr[0][2].toString(), 'a-xyz');

        t.equal(arr[1][0].toString(), 'b-foo');
        t.equal(arr[1][1].toString(), 'b-bar');
        t.equal(arr[1][2].toString(), 'b-xyz');

        t.equal(arr[2][0].toString(), 'c-foo');
        t.equal(arr[2][1].toString(), 'c-bar');
        t.equal(arr[2][2].toString(), 'c-xyz');
        t.end();
    });

    from.pipe(encode).pipe(decode).pipe(to);
});
