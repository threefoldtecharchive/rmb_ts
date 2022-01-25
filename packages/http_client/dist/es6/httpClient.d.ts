import { MessageBusClientInterface } from "ts-rmb-client-base";
declare enum KeypairType {
    sr25519 = "sr25519",
    ed25519 = "ed25519"
}
declare class HTTPMessageBusClient implements MessageBusClientInterface {
    client: unknown;
    proxyURL: string;
    twinId: number;
    graphqlURL: string;
    mnemonic: string;
    keypairType: KeypairType;
    constructor(twinId: number, proxyURL: string, graphqlURL: string, mnemonic: string, keypairType?: KeypairType);
    prepare(command: string, destination: number[], expiration: number, retry: number): Record<string, unknown>;
    send(message: Record<string, unknown>, payload: string): Promise<Record<string, unknown>>;
    read(message: Record<string, unknown>): Promise<Record<string, unknown>[]>;
}
export { HTTPMessageBusClient };
//# sourceMappingURL=httpClient.d.ts.map