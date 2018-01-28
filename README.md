# framed-msg

[![Dependencies](https://img.shields.io/david/trygve-lie/framed-msg.svg?style=flat-square)](https://david-dm.org/trygve-lie/framed-msg)[![Build Status](http://img.shields.io/travis/trygve-lie/framed-msg/master.svg?style=flat-square)](https://travis-ci.org/trygve-lie/framed-msg)

A framing message protocol for packing multiple opaque binary arguments. Comes
with both static and stream based parser API.

## Installation

```bash
$ npm install framed-msg
```

## Examples

Encode and decode a message:

```js
const fmsg = require('framed-msg');
const bin = fmsg.encode([Buffer.from('Hello'), Buffer.from('World')]);
const msg = fmsg.decode(bin);

console.log(msg[0].toString(), msg[1].toString()); // Prints; Hello World
```

Stream decoding a message:

```js
const fmsg = require('framed-msg');

const msg = new fmsg.DecodeStream();
msg.pipe(process.stdout)

const bin = fmsg.encode([Buffer.from('Hello'), Buffer.from('World')]);
msg.write(bin);
```

## API

This module have the following API:

### .encode(bufs)

Encodes an Array of Buffers into a framed message.

```js
const fmsg = require('framed-msg');
const bin = fmsg.encode([Buffer.from('Hello'), Buffer.from('World')]);
```

### .decode(message)

Decodes a framed message into an Array of Buffers.

```js
const fmsg = require('framed-msg');
const msg = fmsg.decode(msgFromEncoder);
```

### .streamDecode()

A transform stream for stream decoding framed messages.

```js
const stream = require('stream');
const fmsg = require('framed-msg');
const net = require('net');

net.createServer((socket) => {
    const decoder = new fmsg.DecodeStream();
    socket.pipe(decoder).pipe(new stream.Writable({
        objectMode: true,
        write: (chunk, enc, next) => {
            console.log(chunk[0].toString());  // Hello
            console.log(chunk[1].toString());  // World
            next();
        }
    }));
}).listen(3000);

const client = net.connect(3000);
const msg = fmsg.encode([Buffer.from('Helo'), Buffer.from('Worlds')]);
client.write(msg);
```


## Protocol

The protocol is simple. The first byte of the message contains an
argument count of the number of arguments to expect in the message.

Its then followed by a pair of size frames and arguments. The size
frame is a 32-bit unsigned integer providing the size of the following
argument. The argument can be any opaque binary so it can hold any
String, stringified JSON, image etc...

The massage can hold up to 128 arguments.

```
+--------+----------+--------+----------+--------+
| <argc> | <length> | <data> | <length> | <data> | etc..
+--------+----------+--------+----------+--------+
```


## Benchmarks

On node.js version 9.4.0:

```sh
> node benchmark/main.js

.encode() x 2,096,246 ops/sec ±0.69% (91 runs sampled)
.decode() x 5,474,602 ops/sec ±1.20% (93 runs sampled)
.decodeStream() x 1,044,913 ops/sec ±31.77% (67 runs sampled)
```


## node.js compabillity

This module is written in ES6 and uses some functions only found in node.js 8.2
and newer. This module will not function with older than 8.2 versions of node.js.


## License

The MIT License (MIT)

Copyright (c) 2018 - Trygve Lie - post@trygve-lie.com

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
