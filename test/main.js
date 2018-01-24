'use strict';

const Msg = require('../');
const tap = require('tap');

/**
 * Constructor
 */

tap.test('FramedMsg() - object type - should be FramedMsg', (t) => {
    const message = new Msg();
    t.equal(Object.prototype.toString.call(message), '[object FramedMsg]');
    t.end();
});


/**
 * .encode() - .decode()
 */

tap.test('FramedMsg.*code() - no arguments to encoder - should decode to zero arguments', (t) => {
    const bin = Msg.encode();
    const msg = Msg.decode(bin);

    t.equal(msg.length, 0);
    t.end();
});

tap.test('FramedMsg.*code() - empty Array to encoder - should decode to zero arguments', (t) => {
    const bin = Msg.encode([]);
    const msg = Msg.decode(bin);

    t.equal(msg.length, 0);
    t.end();
});

tap.test('FramedMsg.*code() - multiple arguments to encoder - should decode into multiple arguments', (t) => {
    const bin = Msg.encode([Buffer.from('foo'), Buffer.from('bar')]);
    const msg = Msg.decode(bin);

    t.equal(msg.length, 2);
    t.equal(msg[0].toString(), 'foo');
    t.equal(msg[1].toString(), 'bar');
    t.end();
});


/**
 * ._write()
 */

tap.test('FramedMsg._write() - write encoded messages on stream - should emit buffer on data event', (t) => {
    const msg = new Msg();

    const a = Msg.encode([Buffer.from('foo')]);
    const b = Msg.encode([Buffer.from('foo'), Buffer.from('bar')]);
    const c = Msg.encode([Buffer.from('foo'), Buffer.from('bar'), Buffer.from('xyz')]);

    let n = 0;

    msg.on('data', (message) => {
        switch (n++) {
        case 0:
            t.equal(message.length, 1);
            t.equal(message[0].toString(), 'foo');
            break;

        case 1:
            t.equal(message.length, 2);
            t.equal(message[0].toString(), 'foo');
            t.equal(message[1].toString(), 'bar');
            break;

        case 2:
            t.equal(message.length, 3);
            t.equal(message[0].toString(), 'foo');
            t.equal(message[1].toString(), 'bar');
            t.equal(message[2].toString(), 'xyz');
            t.end();
            break;
        }
    });

    msg.write(a);
    msg.write(b);
    msg.write(c);
});
