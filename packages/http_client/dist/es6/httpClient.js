var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import axios from "axios";
import { Base64 } from "js-base64";
import { Buffer } from "buffer";
import { Keyring } from "@polkadot/keyring";
import { waitReady } from "@polkadot/wasm-crypto";
import { MD5 } from "crypto-js";
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
function sign(msg, mnemonic, keypairType) {
    return __awaiter(this, void 0, void 0, function* () {
        const m = MD5(msg).toString();
        const message = Buffer.from(m, "hex");
        const keyring = new Keyring({ type: keypairType });
        yield waitReady();
        const keypair = keyring.addFromMnemonic(mnemonic);
        const signedMessage = keypair.sign(message);
        const hexSignedMessage = Buffer.from(signedMessage).toString("hex");
        const type = keypairType == KeypairType.sr25519 ? "s" : "e";
        const hexType = Buffer.from(type).toString("hex");
        return hexType + hexSignedMessage;
    });
}
;
function getTwinPublicKey(twinId, url) {
    return __awaiter(this, void 0, void 0, function* () {
        const query = `query getTwinAccountId($twinId: Int!){
        twins(where: {twinId_eq: $twinId}) {
          accountId
        }
      }
      `;
        const body = JSON.stringify({ query, variables: { twinId } });
        const headers = { "Content-Type": "application/json" };
        try {
            const res = yield axios.post(url, body, { headers });
            const pubkeys = res["data"]["data"]["twins"];
            if (pubkeys.length === 0) {
                throw new Error(`Couldn't find a twin with id: ${twinId}`);
            }
            return pubkeys[0]["accountId"];
        }
        catch (e) {
            throw new Error(e.message);
        }
    });
}
function verify(msg, url) {
    return __awaiter(this, void 0, void 0, function* () {
        const pubkey = yield getTwinPublicKey(msg.src, url);
        const message = challenge(msg);
        const messageHash = MD5(message).toString();
        const messageBytes = Buffer.from(messageHash, "hex");
        const signature = msg.sig.slice(2);
        const signatureBytes = Buffer.from(signature, "hex");
        const keypairTypeBytes = msg.sig.slice(0, 2);
        const keypairTypeChar = Buffer.from(keypairTypeBytes, "hex").toString();
        const keypairType = keypairTypeChar == "s" ? KeypairType.sr25519 : KeypairType.ed25519;
        const keyring = new Keyring({ type: keypairType });
        const keypair = keyring.addFromAddress(pubkey);
        const result = keypair.verify(messageBytes, signatureBytes, keypair.publicKey);
        if (!result) {
            throw new Error("Couldn't verify the response signature");
        }
    });
}
class HTTPMessageBusClient {
    constructor(twinId, proxyURL, graphqlURL, mnemonic, keypairType = KeypairType.sr25519) {
        this.proxyURL = proxyURL;
        this.twinId = twinId;
        this.graphqlURL = graphqlURL;
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
            pxy: true
        };
    }
    send(message, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                message.dat = Base64.encode(payload);
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
                        message.sig = yield sign(challengeMessage, this.mnemonic, this.keypairType);
                        const body = JSON.stringify(message);
                        console.log(`Sending {try ${i}}: ${url}`);
                        const res = yield axios.post(url, body);
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
        });
    }
    read(message) {
        return __awaiter(this, void 0, void 0, function* () {
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
                        const res = yield axios.post(url);
                        yield verify(res.data[0], this.graphqlURL);
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
        });
    }
}
export { HTTPMessageBusClient };
