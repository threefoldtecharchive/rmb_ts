import redis from "redis";
import uuid4 from "uuid4";
import { MessageBusClientInterface } from "ts-rmb-client-base";

class MessageBusClient implements MessageBusClientInterface {
    client: redis;
    constructor(port = 6379) {
        const client = redis.createClient(port);
        client.on("error", function (error) {
            console.error(error);
        });

        this.client = client;
    }

    prepare(command: string, destination: number[], expiration: number, retry: number): Record<string, unknown> {
        return {
            ver: 1,
            uid: "",
            cmd: command,
            exp: expiration,
            dat: "",
            src: 0,
            dst: destination,
            ret: uuid4(),
            try: retry,
            shm: "",
            now: Math.floor(new Date().getTime() / 1000),
            err: "",
        };
    }

    async send(message: Record<string, unknown>, payload: string): Promise<Record<string, unknown>> {
        const buffer = Buffer.from(payload);
        message.dat = buffer.toString("base64");
        const request = JSON.stringify(message);

        this.client.lpush(["msgbus.system.local", request], redis.print);
        console.log(request);
        return message;
    }

    read(message: Record<string, unknown>): Promise<Record<string, unknown>[]> {
        return new Promise((resolve, reject) => {
            console.log("waiting reply", message.ret);

            const responses = [];

            this.client.blpop(message.ret, 0, function (err, reply) {
                if (err) {
                    console.log(`err while waiting for reply: ${err}`);
                    reject(err);
                }

                const response = JSON.parse(reply[1]);
                response["dat"] = Buffer.from(response["dat"], "base64").toString("ascii");
                responses.push(response);
                const msgDst = message.dst as number[];
                // checking if we have all responses
                if (responses.length == msgDst.length) {
                    resolve(responses);
                }
            });
        });
    }
}

export { MessageBusClient };
