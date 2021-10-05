"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTTPMessageBusClient = void 0;
const axios_1 = __importDefault(require("axios"));
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
            ret: null,
            try: retry,
            shm: "",
            now: Math.floor(new Date().getTime() / 1000),
            err: "",
        };
    }
    async send(message, payload) {
        message.dat = btoa(payload);
        if (message.dst.length > 1) {
            throw new Error("Http client does not support multi destinations");
        }
        const body = JSON.stringify(message);
        const dst = message.dst[0];
        const sendURL = `${this.proxyURL}/twin/${dst}`;
        let msgIdentifier;
        console.log(`The request URL is : ${sendURL}`);
        await axios_1.default
            .post(sendURL, body)
            .then(res => {
            console.log(`the send api response: ${res.status}`);
            console.log(res.data);
            msgIdentifier = res.data;
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
        const dst = message.dst[0];
        const retqueue = message.ret;
        let ret;
        if (!retqueue) {
            throw new Error("The Message retqueue is null");
        }
        await axios_1.default
            .post(`${this.proxyURL}/twin/${dst}/${retqueue}`)
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
