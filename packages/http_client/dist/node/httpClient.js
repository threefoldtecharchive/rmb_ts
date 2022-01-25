"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTTPMessageBusClient = void 0;
const axios_1 = __importDefault(require("axios"));
const js_base64_1 = require("js-base64");
const buffer_1 = require("buffer");
const keyring_1 = require("@polkadot/keyring");
const wasm_crypto_1 = require("@polkadot/wasm-crypto");
const crypto_js_1 = require("crypto-js");
function validDestination(dst) {
    if (dst.length > 1) {
        return "Http client does not support multi destinations";
    }
    else if (!dst.length) {
        return "The message destination is empty";
    }
    return "";
}
var KeypairType;
(function (KeypairType) {
    KeypairType["sr25519"] = "sr25519";
    KeypairType["ed25519"] = "ed25519";
})(KeypairType || (KeypairType = {}));
function challenge(msg) {
    let out = "";
    out += msg.ver;
    out += msg.uid;
    out += msg.cmd;
    out += msg.dat;
    out += msg.src;
    for (const d of msg.dst) {
        out += d;
    }
    out += msg.dst;
    out += msg.ret;
    out += msg.now;
    out += msg.pxy;
    return out;
}
async function sign(msg, mnemonic, keypairType) {
    const m = (0, crypto_js_1.MD5)(msg).toString();
    const message = buffer_1.Buffer.from(m, "hex");
    const keyring = new keyring_1.Keyring({ type: keypairType });
    await (0, wasm_crypto_1.waitReady)();
    const keypair = keyring.addFromMnemonic(mnemonic);
    const signedMessage = keypair.sign(message);
    const hexSignedMessage = buffer_1.Buffer.from(signedMessage).toString("hex");
    const type = keypairType == KeypairType.sr25519 ? "s" : "e";
    return type + hexSignedMessage;
}
;
class HTTPMessageBusClient {
    client;
    proxyURL;
    twinId;
    mnemonic;
    keypairType;
    constructor(twinId, proxyURL, mnemonic, keypairType = KeypairType.sr25519) {
        this.proxyURL = proxyURL;
        this.twinId = twinId;
        this.mnemonic = mnemonic;
        this.keypairType = keypairType;
    }
    prepare(command, destination, expiration, retry) {
        return {
            ver: 1,
            uid: "",
            cmd: command,
            exp: expiration,
            dat: "",
            src: this.twinId,
            dst: destination,
            ret: "",
            try: retry,
            shm: "",
            now: Math.floor(new Date().getTime() / 1000),
            err: "",
            sig: "",
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
            const url = `${this.proxyURL}/twin/${dst[0]}`;
            let msgIdentifier;
            for (let i = 1; i <= retries; i++) {
                try {
                    message.now = Math.floor(new Date().getTime() / 1000);
                    const challengeMessage = challenge(message);
                    message.sig = await sign(challengeMessage, this.mnemonic, this.keypairType);
                    const body = JSON.stringify(message);
                    console.log(`Sending {try ${i}}: ${url}`);
                    const res = await axios_1.default.post(url, body);
                    console.log(`Sending {try ${i}}: Success`);
                    msgIdentifier = JSON.parse(JSON.stringify(res.data));
                    console.log(msgIdentifier);
                    message.ret = msgIdentifier.retqueue;
                    return message;
                }
                catch (error) {
                    if (error.response.data) {
                        console.log(error.response.data.message);
                    }
                    if (i < retries) {
                        console.log(`try ${i}: cannot send the message, Message: ${error.message}`);
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
