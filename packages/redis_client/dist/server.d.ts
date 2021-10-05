import redis from "redis";
declare class MessageBusServer {
    client: redis;
    handlers: any;
    constructor(port: number);
    withHandler(topic: any, handler: any): void;
    run(): void;
    reply(message: any, payload: any): void;
    error(message: any, reason: any): void;
}
export { MessageBusServer };
