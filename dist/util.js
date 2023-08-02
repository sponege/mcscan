"use strict";
exports.__esModule = true;
exports.sleep = exports.promiseWithTimeout = exports.int2ip = exports.ip2int = void 0;
function ip2int(ip) {
    // Takes an IP address and returns an integer
    // Returns null if the IP is invalid
    // ex: ip2int("92.15.73.35") -> 1544505635
    try {
        var num = ip
            .split(".")
            .reduce(function (acc, current) { return (acc << 8) + parseInt(current); }, 0);
        if (num == NaN)
            return null;
        else
            return num;
    }
    catch (e) {
        return null;
    }
}
exports.ip2int = ip2int;
function int2ip(num) {
    // Takes an integer and returns an IP address
    // ex: int2ip(1544505635) -> "92.15.73.35"
    var octets = [];
    for (var i = 0; i < 4; i++) {
        octets.unshift(num & 255);
        num >>= 8;
    }
    return octets.join(".");
}
exports.int2ip = int2ip;
function promiseWithTimeout(promise, ms, timeoutError) {
    if (timeoutError === void 0) { timeoutError = new Error("Promise timed out"); }
    // stolen from https://dev.to/nikosanif/create-promises-with-timeout-error-in-typescript-fmm
    // thanks nikosanif!
    // create a promise that rejects in milliseconds
    var timeout = new Promise(function (_, reject) {
        setTimeout(function () {
            reject(timeoutError);
        }, ms);
    });
    // returns a race between timeout and the passed promise
    return Promise.race([promise, timeout]);
}
exports.promiseWithTimeout = promiseWithTimeout;
function sleep(ms) {
    // copilot stole this off of the internet lol
    return new Promise(function (resolve) { return setTimeout(resolve, ms); });
}
exports.sleep = sleep;
