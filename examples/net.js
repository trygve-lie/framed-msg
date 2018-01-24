'use strict';

const Msg = require('../');
const net = require('net');

// Socket server
const server = net.createServer((socket) => {
    const msg = new Msg();

    msg.on('data', (message) => {
        console.log(message[0].toString(), message[1].toString(), message[2].toString());
    });

    socket.pipe(msg);
}).listen(3000);


// Connect to socket server
const client = net.connect(3000);

setInterval(() => {
    const m = Msg.encode([Buffer.from('foo'), Buffer.from('bar'), Buffer.from(Date.now().toString())]);
    client.write(m);
}, 50);
