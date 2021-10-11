import { MessageBusClientInterface } from "ts-rmb-client-base";
declare class HTTPMessageBusClient implements MessageBusClientInterface {
    client: unknown;
    proxyURL: string;
    constructor(proxyURL: string);
    prepare(command: string, destination: number[], expiration: number, retry: number): Record<string, unknown>;
    send(message: Record<string, unknown>, payload: string): Promise<Record<string, unknown>>;
    read(message: Record<string, unknown>): Promise<Record<string, unknown>[]>;
}
export { HTTPMessageBusClient };
