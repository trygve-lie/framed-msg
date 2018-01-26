'use strict';

const decode = (buf) => {
    // TODO: add minimum length check. throw if too small

    const argv = [];
    let len = 0;
    let off = 0;

    // Get amount of arguments to expect
    const argc = buf.readInt8(0);
    off += 1;

    // Get each argument
    for (let i = 0; i < argc; i++) {
        len = buf.readUInt32BE(off);
        off += 4;
        argv[i] = buf.slice(off, off += len);
    }

    return argv;
};

module.exports = decode;
