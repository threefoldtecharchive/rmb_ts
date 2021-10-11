import axios from "axios";
import { Base64 } from "js-base64";

import { MessageBusClientInterface } from "ts-rmb-client-base";

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
    twinId: number;
    constructor(twinId: number, proxyURL: string) {
        this.proxyURL = proxyURL;
        this.twinId = twinId;
    }

    prepare(command: string, destination: number[], expiration: number, retry: number): Record<string, unknown> {
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
        };
    }

    async send(message: Record<string, unknown>, payload: string): Promise<Record<string, unknown>> {
        try {
            message.dat = Base64.encode(payload);
            const dst = message.dst as number[];
            const retries = message.try as number; // amount of retries we're willing to do
            const s = validDestination(dst);
            if (s) {
                throw new Error(s);
            }

            const body = JSON.stringify(message);
            const url = `${this.proxyURL}/twin/${dst[0]}`;
            let msgIdentifier: Record<string, string>;

            for (let i = 1; i <= retries; i++) {
                try {
                    console.log(`Sending {try ${i}}: ${url}`);
                    const res = await axios.post(url, body);
                    console.log(`Sending {try ${i}}: Success`);
                    msgIdentifier = JSON.parse(JSON.stringify(res.data));
                    console.log(msgIdentifier);
                    message.ret = msgIdentifier.retqueue;
                    return message;
                } catch (error) {
                    if (error.response.data) {
                        console.log(error.response.data.message);
                    }
                    if (i < retries) {
                        console.log(`try ${i}: cannot send the message, Message: ${error.message}`);
                    } else {
                        throw new Error(error.message);
                    }
                }
            }
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async read(message: Record<string, unknown>): Promise<Record<string, unknown>[]> {
        try {
            const dst = message.dst as number[];
            const retries = message.try as number; // amount of retries we're willing to do
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
                    const res = await axios.post(url);
                    return res.data;
                } catch (error) {
                    if (i < retries) {
                        console.log(`try ${i}: cannot read the message, Message: ${error.message}`);
                    } else {
                        throw new Error(error.message);
                    }
                }
                console.log("read");
            }
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

export { HTTPMessageBusClient };
