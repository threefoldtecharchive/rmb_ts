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
function sign(msg, mnemonic, keypairType) {
    return __awaiter(this, void 0, void 0, function* () {
        const message = Buffer.from(msg);
        const keyring = new Keyring({ type: keypairType });
        yield waitReady();
        const keypair = keyring.addFromMnemonic(mnemonic);
        const signedMessage = keypair.sign(message);
        const hexSignedMessage = Buffer.from(signedMessage).toString("hex");
        return hexSignedMessage;
    });
}
;
class HTTPMessageBusClient {
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
            typ: this.keypairType
        };
    }
    send(message, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                message.dat = Base64.encode(payload);
                let sig = "";
                sig += message.cmd;
                sig += message.dat;
                message.sig = yield sign(sig, this.mnemonic, this.keypairType);
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
