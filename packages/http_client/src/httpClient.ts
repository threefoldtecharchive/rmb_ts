import axios from "axios";
import { Base64 } from "js-base64";
import { Buffer } from "buffer";
import { Keyring } from "@polkadot/keyring";
import { waitReady } from "@polkadot/wasm-crypto";
import { MD5 } from "crypto-js";
import { Message, MessageBusClientInterface } from "ts-rmb-client-base";

function validDestination(dst: number[]): string {
    if (dst.length > 1) {
        return "Http client does not support multi destinations";
    } else if (!dst.length) {
        return "The message destination is empty";
    }
    return "";
}

enum KeypairType {
    sr25519 = "sr25519",
    ed25519 = "ed25519"
}

function challenge(msg: Message): string {
    let out = "";
    out += msg.ver;
    out += msg.uid;
    out += msg.cmd;
    out += msg.dat;
    out += msg.src;
    for (const d of msg.dst as []) {
        out += d;
    }
    out += msg.ret;
    out += msg.now;
    out += msg.pxy;
    return out;
}

async function sign(msg: string, mnemonic: string, keypairType: KeypairType) {
    const m = MD5(msg).toString();
    const message = Buffer.from(m, "hex");

    const keyring = new Keyring({ type: keypairType });
    await waitReady();
    const keypair = keyring.addFromMnemonic(mnemonic);
    const signedMessage = keypair.sign(message);
    const hexSignedMessage = Buffer.from(signedMessage).toString("hex");

    const type = keypairType == KeypairType.sr25519 ? "s" : "e";
    const hexType = Buffer.from(type).toString("hex");

    return hexType + hexSignedMessage;
};

async function getTwinPublicKey(twinId: number, url: string) {
    const query = `query getTwinAccountId($twinId: Int!){
        twins(where: {twinID_eq: $twinId}) {
          accountID
        }
      }
      `;

    const body = JSON.stringify({ query, variables: { twinId } });
    const headers = { "Content-Type": "application/json" };
    try {
        const res = await axios.post(url, body, { headers });
        const pubkeys = res["data"]["data"]["twins"];
        if (pubkeys.length === 0) {
            throw new Error(`Couldn't find a twin with id: ${twinId}`);
        }
        return pubkeys[0]["accountID"];
    } catch (e) {
        throw new Error(e.message);
    }
}

async function verify(msg: any, url: string) {
    const pubkey = await getTwinPublicKey(msg.src, url);

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
}

class HTTPMessageBusClient implements MessageBusClientInterface {
    client: unknown;
    proxyURL: string;
    twinId: number;
    graphqlURL: string;
    mnemonic: string;
    keypairType: KeypairType;
    verifyResponse: boolean;
    constructor(twinId: number, proxyURL: string, graphqlURL: string, mnemonic: string, keypairType: KeypairType = KeypairType.sr25519, verifyResponse = false) {
        this.proxyURL = proxyURL;
        this.twinId = twinId;
        this.graphqlURL = graphqlURL;
        this.mnemonic = mnemonic;
        this.keypairType = keypairType;
        this.verifyResponse = verifyResponse;
    }

    prepare(command: string, destination: number[], expiration: number, retry: number): Message {
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
            // should be always false for signature compatibility
            pxy: false
        };
    }

    async send(message: Message, payload: string): Promise<Message> {
        try {
            message.dat = Base64.encode(payload);
            const dst = message.dst;
            const retries = message.try; // amount of retries we're willing to do
            const s = validDestination(dst);
            if (s) {
                throw new Error(s);
            }

            const url = `${this.proxyURL}/twin/${dst[0]}`;

            for (let i = 1; i <= retries; i++) {
                try {
                    message.now = Math.floor(new Date().getTime() / 1000);
                    const challengeMessage = challenge(message);
                    message.sig = await sign(challengeMessage, this.mnemonic, this.keypairType);
                    const body = JSON.stringify(message);

                    console.log(`Sending {try ${i}}: ${url}`);
                    const res = await axios.post(url, body);
                    console.log(`Sending {try ${i}}: Success`);
                    const msgIdentifier = JSON.parse(JSON.stringify(res.data));
                    message.ret = msgIdentifier.retqueue;
                    return message;
                } catch (error) {
                    if (i < retries) {
                        console.log(`try ${i}: cannot send the message, Message: ${error.message}`);
                    } else {
                        let errorMessage = error.message;
                        if (error.response.data) {
                            errorMessage = `${errorMessage} due to ${error.response.data.Message}`;
                        }
                        throw new Error(errorMessage);
                    }
                }
            }
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async read(message: Message): Promise<Message[]> {
        try {
            const dst = message.dst;
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
            while (new Date().getTime() < now + 1000 * message.exp) {
                try {
                    console.log(`Reading: ${url}`);
                    const res = await axios.post(url);
                    if (!res.data[0]) {
                        throw Error("Couldn't get the response")
                    }
                    if (this.verifyResponse) {
                        await verify(res.data[0], this.graphqlURL);
                    }
                    return res.data;
                } catch (error) {
                    console.log(error.message);
                    await new Promise(f => setTimeout(f, 1000));
                }
            }
            // time exceeded
            throw Error(`Failed to get a response from twin ${dst[0]} after a minute or couldn't verify the response`)
        } catch (error) {
            let errorMessage = error.message;
            if (error.response.data) {
                errorMessage = `${errorMessage} due to ${error.response.data.Message}`;
            }
            throw new Error(error.message);
        }
    }
}

export { HTTPMessageBusClient };
