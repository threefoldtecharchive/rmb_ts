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
    const hexType = buffer_1.Buffer.from(type).toString("hex");
    return hexType + hexSignedMessage;
}
;
async function getTwinPublicKey(twinId, url) {
    const query = `query getTwinAccountId($twinId: Int!){
        twins(where: {twinId_eq: $twinId}) {
          accountId
        }
      }
      `;
    const body = JSON.stringify({ query, variables: { twinId } });
    const headers = { "Content-Type": "application/json" };
    try {
        const res = await axios_1.default.post(url, body, { headers });
        const pubkeys = res["data"]["data"]["twins"];
        if (pubkeys.length === 0) {
            throw new Error(`Couldn't find a twin with id: ${twinId}`);
        }
        return pubkeys[0]["accountId"];
    }
    catch (e) {
        throw new Error(e.message);
    }
}
async function verify(msg, url) {
    const pubkey = await getTwinPublicKey(msg.src, url);
    const message = challenge(msg);
    const messageHash = (0, crypto_js_1.MD5)(message).toString();
    const messageBytes = buffer_1.Buffer.from(messageHash, "hex");
    const signature = msg.sig.slice(2);
    const signatureBytes = buffer_1.Buffer.from(signature, "hex");
    const keypairTypeBytes = msg.sig.slice(0, 2);
    const keypairTypeChar = buffer_1.Buffer.from(keypairTypeBytes, "hex").toString();
    const keypairType = keypairTypeChar == "s" ? KeypairType.sr25519 : KeypairType.ed25519;
    const keyring = new keyring_1.Keyring({ type: keypairType });
    const keypair = keyring.addFromAddress(pubkey);
    const result = keypair.verify(messageBytes, signatureBytes, keypair.publicKey);
    if (!result) {
        throw new Error("Couldn't verify the response signature");
    }
}
class HTTPMessageBusClient {
    client;
    proxyURL;
    twinId;
    graphqlURL;
    mnemonic;
    keypairType;
    verifyResponse;
    constructor(twinId, proxyURL, graphqlURL, mnemonic, keypairType = KeypairType.sr25519, verifyResponse = false) {
        this.proxyURL = proxyURL;
        this.twinId = twinId;
        this.graphqlURL = graphqlURL;
        this.mnemonic = mnemonic;
        this.keypairType = keypairType;
        this.verifyResponse = verifyResponse;
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
            pxy: true
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
            const now = new Date().getTime();
            while (new Date().getTime() < now + 1000 * 60) {
                try {
                    console.log(`Reading: ${url}`);
                    const res = await axios_1.default.post(url);
                    if (!res.data[0]) {
                        throw Error("Couldn't get the response");
                    }
                    if (this.verifyResponse) {
                        await verify(res.data[0], this.graphqlURL);
                    }
                    return res.data;
                }
                catch (error) {
                    console.log(error.message);
                    await new Promise(f => setTimeout(f, 1000));
                }
            }
            // time exceeded
            throw Error(`Failed to get a response from twin ${dst[0]} after a minute or couldn't verify the response`);
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
}
exports.HTTPMessageBusClient = HTTPMessageBusClient;
