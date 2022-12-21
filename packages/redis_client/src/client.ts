import { createClient, RedisClientType } from "redis";
import uuid4 from "uuid4";
import { MessageBusClientInterface, Message } from "ts-rmb-client-base";
class MessageBusClient implements MessageBusClientInterface {
    client: RedisClientType
    constructor(port = 6379) {
        this.client = createClient({
            socket: {
                port: port,
            },
        });
        this.client.connect()
        this.client.on("error", function (error) {
            console.error(error);
        });
    }

    prepare(command: string, destination: number[], expiration: number, retry: number): Message {
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
            sig: "",
            pxy: false
        };
    }

    async send(message: Message, payload: string): Promise<Message> {
        const buffer = Buffer.from(payload);
        message.dat = buffer.toString("base64");
        const request = JSON.stringify(message);
        await this.client.lPush("msgbus.system.local", request);
        console.log(request);
        return message;
    }

    async read(message: Message): Promise<Message[]> {
        console.log("waiting reply", message.ret);
        const responses = [];
        for (let i = 0; i < message.dst.length; i++) {
            const res = await this.client.blPop(message.ret, 0)
            if (res) {
                const response = JSON.parse(res.element);
                response.dat = Buffer.from(response.dat, "base64").toString("ascii");
                responses.push(response);
            }
        }
        return responses
    }
}

export { MessageBusClient };
