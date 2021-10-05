import { default as axios } from "axios";

import { MessageBusClientInterface } from "ts-rmb-client-base";

function decodeBase64(s: string): string {
    let b: number,
        l = 0,
        r = "";
    const m = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    s.split("").forEach(function (v) {
        b = (b << 6) + m.indexOf(v);
        l += 6;
        if (l >= 8) r += String.fromCharCode((b >>> (l -= 8)) & 0xff);
    });
    return r;
}

function validDestination(dst: number[]): string {
    if (dst.length > 1) {
        return "Http client does not support multi destinations";
    } else if (!dst.length) {
        return "The message destination is empty";
    }
    return "";
}

class HTTPMessageBusClient implements MessageBusClientInterface {
    client: unknown;
    proxyURL: string;
    constructor(proxyURL: string) {
        this.proxyURL = proxyURL;
    }

    prepare(command: string, destination: number[], expiration: number, retry: number): Record<string, unknown> {
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

    async send(message: Record<string, unknown>, payload: string): Promise<Record<string, unknown>> {
        message.dat = decodeBase64(payload);
        const dst = message.dst as number[];
        const s = validDestination(dst);
        if (s) {
            throw new Error(s);
        }

        const body = JSON.stringify(message);
        const sendURL = `${this.proxyURL}/twin/${dst[0]}`;
        let msgIdentifier: Record<string, string>;

        console.log(`The request URL is : ${sendURL}`);
        await axios
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

    async read(message: Record<string, unknown>): Promise<Record<string, unknown>[]> {
        const dst = message.dst as number[];
        const s = validDestination(dst);
        const retqueue = message.ret;
        let ret;
        if (s) {
            throw new Error(s);
        }
        if (!retqueue) {
            throw new Error("The Message retqueue is null");
        }

        await axios
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

export { HTTPMessageBusClient };
