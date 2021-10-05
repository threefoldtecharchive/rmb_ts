"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTTPMessageBusClient = void 0;
const axios_1 = __importDefault(require("axios"));
function decodeBase64(s) {
    let b, l = 0, r = "";
    const m = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    s.split("").forEach(function (v) {
        b = (b << 6) + m.indexOf(v);
        l += 6;
        if (l >= 8)
            r += String.fromCharCode((b >>> (l -= 8)) & 0xff);
    });
    return r;
}
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
        message.dat = decodeBase64(payload);
        const dst = message.dst;
        const s = validDestination(dst);
        if (s) {
            throw new Error(s);
        }
        const body = JSON.stringify(message);
        const sendURL = `${this.proxyURL}/twin/${dst[0]}`;
        let msgIdentifier;
        console.log(`The request URL is : ${sendURL}`);
        await axios_1.default
            .post(sendURL, body)
            .then(res => {
            console.log(`the send api response: ${res.status}`);
            console.log(res.data);
            msgIdentifier = JSON.parse(JSON.stringify(res.data));
        })
            .catch(error => {
            if (error.response) {
                console.log(error.response.data);
            }
            throw new Error(error.message);
        });
        message.ret = msgIdentifier.retqueue;
        return message;
    }
    async read(message) {
        const dst = message.dst;
        const s = validDestination(dst);
        const retqueue = message.ret;
        let ret;
        if (s) {
            throw new Error(s);
        }
        if (!retqueue) {
            throw new Error("The Message retqueue is null");
        }
        await axios_1.default
            .post(`${this.proxyURL}/twin/${dst[0]}/${retqueue}`)
            .then(res => {
            console.log(`the read api response for retqueue ( ${retqueue} ) is : ${res.status}`);
            ret = res.data;
        })
            .catch(error => {
            throw new Error(error.message);
        });
        return ret;
    }
}
exports.HTTPMessageBusClient = HTTPMessageBusClient;
