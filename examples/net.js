'use strict';

const fmsg = require('../');
const net = require('net');

// Socket server
net.createServer((socket) => {
    const msg = new fmsg.DecodeStream();

    msg.on('data', (message) => {
        console.log(message[0].toString(), message[1].toString(), message[2].toString());
    });

    socket.pipe(msg);
}).listen(3000);


// Connect to socket server
const client = net.connect(3000);

setInterval(() => {
    const m = fmsg.encode([Buffer.from('foo'), Buffer.from('bar'), Buffer.from(Date.now().toString())]);
    client.write(m);
}, 50);
