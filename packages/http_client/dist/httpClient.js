"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTTPMessageBusClient = void 0;
const axios_1 = __importDefault(require("axios"));
const js_base64_1 = require("js-base64");
function validDestination(dst) {
    if (dst.length > 1) {
        return "Http client does not support multi destinations";
    }
    else if (!dst.length) {
        return "The message destination is empty";
    }
    return "";
}
class HTTPMessageBusClient {
    client;
    proxyURL;
    constructor(proxyURL) {
        this.proxyURL = proxyURL;
    }
    prepare(command, destination, expiration, retry) {
        return {
            ver: 1,
            uid: "",
            cmd: command,
            exp: expiration,
            dat: "",
            src: destination[0] || 0,
            dst: destination,
            ret: "",
            try: retry,
            shm: "",
            now: Math.floor(new Date().getTime() / 1000),
            err: "",
        };
    }
    async send(message, payload) {
        try {
            message.dat = js_base64_1.Base64.encode(payload);
            const dst = message.dst;
            const retries = message.try; // amount of retries we're willing to do
            const s = validDestination(dst);
            if (s) {
                throw new Error(s);
            }
            const body = JSON.stringify(message);
            const url = `${this.proxyURL}/twin/${dst[0]}`;
            let msgIdentifier;
            for (let i = 1; i <= retries; i++) {
                try {
                    console.log(`Sending {try ${i}}: ${url}`);
                    const res = await axios_1.default.post(url, body);
                    console.log(`Sending {try ${i}}: Success`);
                    msgIdentifier = JSON.parse(JSON.stringify(res.data));
                    console.log(msgIdentifier);
                    message.ret = msgIdentifier.retqueue;
                    return message;
                }
                catch (error) {
                    if (i < retries) {
                        console.log(`try ${i}: cannot send the message, Message: ${error.message}`);
                        if (error.request.data) {
                            console.log(error.request.data.message);
                        }
                    }
                    else {
                        throw new Error(error.message);
                    }
                }
            }
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
    async read(message) {
        try {
            const dst = message.dst;
            const retries = message.try; // amount of retries we're willing to do
            const s = validDestination(dst);
            const retqueue = message.ret;
            const url = `${this.proxyURL}/twin/${dst[0]}/${retqueue}`;
            if (s) {
                throw new Error(s);
            }
            if (!retqueue) {
                throw new Error("The Message retqueue is null");
            }
            for (let i = 1; i <= retries; i++) {
                try {
                    console.log(`Reading {try ${i}}: ${url}`);
                    const res = await axios_1.default.post(url);
                    return res.data;
                }
                catch (error) {
                    if (i < retries) {
                        console.log(`try ${i}: cannot read the message, Message: ${error.message}`);
                    }
                    else {
                        throw new Error(error.message);
                    }
                }
                console.log("read");
            }
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
}
exports.HTTPMessageBusClient = HTTPMessageBusClient;
