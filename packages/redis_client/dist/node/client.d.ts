import redis from "redis";
import { MessageBusClientInterface } from "ts-rmb-client-base";
declare class MessageBusClient implements MessageBusClientInterface {
    client: redis;
    constructor(port?: number);
    prepare(command: string, destination: number[], expiration: number, retry: number): Record<string, unknown>;
    send(message: Record<string, unknown>, payload: string): Promise<Record<string, unknown>>;
    read(message: Record<string, unknown>): Promise<Record<string, unknown>[]>;
}
export { MessageBusClient };
