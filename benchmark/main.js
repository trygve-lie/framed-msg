'use strict';

const benchmark = require('benchmark');
const Msg = require('../');

const suite = new benchmark.Suite();

const add = (name, fn) => {
    suite.add(name, fn);
};


/**
 * .encode()
 */

const msg1 = [Buffer.from('foo'), Buffer.from('bar')];

add('.encode()', () => {
    Msg.encode(msg1);
});


/**
 * .decode()
 */

const bin1 = Msg.encode([Buffer.from('foo'), Buffer.from('bar')]);

add('.decode()', () => {
    Msg.decode(bin1);
});


/**
 * stream.write()
 */

const bin2 = Msg.encode([Buffer.from('foo'), Buffer.from('bar')]);
const message = new Msg();

add('stream.write()', () => {
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
