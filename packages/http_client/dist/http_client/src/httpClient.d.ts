import { MessageBusClientInterface } from "../../base/clientInterface";
declare class HTTPMessageBusClient implements MessageBusClientInterface {
    client: unknown;
    proxyURL: string;
    constructor(proxyURL: string);
    prepare(command: string, destination: number[], expiration: number, retry: number): {
        ver: number;
        uid: string;
        cmd: string;
        exp: number;
        dat: string;
        src: number;
        dst: number[];
        ret: string;
        try: number;
        shm: string;
        now: number;
        err: string;
    };
    send(message: Record<string, unknown>, payload: string): Promise<Record<string, unknown>>;
    read(message: Record<string, unknown>): Promise<Record<string, unknown>[]>;
}
export { HTTPMessageBusClient };
