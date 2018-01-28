'use strict';

const stream = require('stream');
const fmsg = require('../');
const net = require('net');

// Socket server
net.createServer((socket) => {
    const msg = new fmsg.DecodeStream();
    socket.pipe(msg).pipe(new stream.Writable({
        objectMode: true,
        write: (chnk, enc, next) => {
            console.log(chnk[0].toString(), chnk[1].toString(), chnk[2].toString());
            next();
        }
    }));
}).listen(3000);


// Connect to socket server
const client = net.connect(3000);

setInterval(() => {
    const m = fmsg.encode([Buffer.from('foo'), Buffer.from('bar'), Buffer.from(Date.now().toString())]);
    client.write(m);
}, 50);
