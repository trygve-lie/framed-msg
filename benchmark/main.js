'use strict';

const benchmark = require('benchmark');
const stream = require('stream');
const fmsg = require('../');

const suite = new benchmark.Suite();

const add = (name, fn) => {
    suite.add(name, fn);
};


/**
 * .encode()
 */

const msg1 = [Buffer.from('foo'), Buffer.from('bar')];

add('.encode()', () => {
    fmsg.encode(msg1);
});


/**
 * .decode()
 */

const bin1 = fmsg.encode([Buffer.from('foo'), Buffer.from('bar')]);

add('.decode()', () => {
    fmsg.decode(bin1);
});


/**
 * DecodeStream()
 */

const bin2 = fmsg.encode([Buffer.from('foo'), Buffer.from('bar')]);
const message = new fmsg.DecodeStream();
message.pipe(new stream.Writable({
    objectMode: true,
    write: (chunk, enc, next) => {
        // console.log('chunk', chunk)
        next();
    }
}));

add('.decodeStream()', () => {
    message.write(bin2);
});


suite
    .on('cycle', (event) => {
        console.log(event.target.toString());
        if (event.target.error) {
            console.error(event.target.error);
        }
    })
    .run();
