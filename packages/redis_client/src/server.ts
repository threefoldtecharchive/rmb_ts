import { createClient, RedisClientType } from "redis";
import { Message } from "ts-rmb-client-base";

class MessageBusServer {
    client: RedisClientType;
    handlers: any;
    constructor(port: number) {
        this.client = createClient({
            socket: {
                port: port,
            },
        });
        this.client.connect()
        this.client.on("error", function (error) {
            console.error(error);
        });

        this.handlers = new Map();
    }

    withHandler(topic: string, handler: (message: Message, payload: string) => unknown): void {
        this.handlers.set(`msgbus.${topic}`, handler);
    }

    async run(): Promise<void> {
        console.log("[+] waiting for request");

        const channels: string[] = Array.from(this.handlers.keys());
        channels.forEach(ch => {
            console.log(`[+] watching ${ch}`);
        });

        const result = await this.client.blPop(channels, 0)
        if (result) {
            const { key, element } = result

            if (!this.handlers.has(key)) {
                console.log(`handler ${key} is not initialized, skipping`);
                return;
            }

            const parsedRequest = JSON.parse(element);
            const payload = Buffer.from(parsedRequest.dat, "base64").toString("ascii");

            const handler = this.handlers.get(key);

            try {
                const data = await handler(parsedRequest, payload);
                console.log(`data from handler: ${data}`);
                await this.reply(parsedRequest, data);
            } catch (error) {
                await this.error(parsedRequest, error as string);
            }
        }

        this.run();
    }

    async reply(message: Message, payload: string): Promise<void> {
        const source = message.src;
        message.dat = Buffer.from(JSON.stringify(payload)).toString("base64");
        message.src = message.dst[0];
        message.dst = [source];
        message.now = Math.floor(new Date().getTime() / 1000);
        await this.client.lPush(message.ret, JSON.stringify(message))
    }

    async error(message: Message, reason: string): Promise<void> {
        console.log("[-] replying error: " + reason);

        const source = message.src;
        message.dat = "";
        message.src = message.dst[0];
        message.dst = [source];
        message.now = Math.floor(new Date().getTime() / 1000);
        message.err = String(reason);
        await this.client.lPush(message.ret, JSON.stringify(message));
    }
}

export { MessageBusServer };
