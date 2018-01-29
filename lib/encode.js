'use strict';

const encode = (args = []) => {
    let argc = 1;
    let off = 0;

    if (args.length > 128) {
        throw new RangeError('Too many arguments. Protocol can not contain more then 128 arguments');
    }

    // Calculate total length of message buffer
    if (args.length !== 0) {
        argc += args.map((arg) => {
            return arg.length + 4;
        }).reduce((pre, cur) => {
            return pre + cur;
        });
    }

    // Create message buffer
    const buf = Buffer.allocUnsafe(argc);

    // Set amount of arguments to expect
    buf.writeInt8(args.length, off);
    off += 1;

    // Set each argument length followed by its argument
    args.forEach((arg, index, arr) => {
        buf.writeUInt32BE(arr[index].length, off);
        arr[index].copy(buf, off += 4);
        off += arr[index].length;
    });

    return buf;
};

module.exports = encode;
