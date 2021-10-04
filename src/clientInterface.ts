interface MessageBusClientInterface {
    client: any;
    prepare(command: string, destination: string[], expiration: number, retry: number): Record<string, unknown>;
    send(message: Record<string, unknown>, payload: string): Record<string, unknown>;
    read(message: Record<string, unknown>): Record<string, unknown>;
}

export { MessageBusClientInterface };
