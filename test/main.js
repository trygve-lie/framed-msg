'use strict';

const crypto = require('crypto');
const fmsg = require('../');
const tap = require('tap');

const LARGE_BUFFER = crypto.randomFillSync(Buffer.alloc(1048576));

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

tap.test('.decodeStream() - object type - should be FramedMsg', (t) => {
    const message = new fmsg.DecodeStream();
    t.equal(Object.prototype.toString.call(message), '[object FramedMsgDecodeStream]');
    t.end();
});

tap.test('.decodeStream() - write encoded messages on stream - should emit buffer on data event', (t) => {
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
