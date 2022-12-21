interface Message {
    ver: number,
    uid: string,
    cmd: string,
    exp: number,
    dat: string,
    src: number,
    dst: number[],
    ret: string,
    try: number,
    shm: string,
    now: number,
    err: string,
    sig: string,
    pxy: boolean
}
interface MessageBusClientInterface {
    client: unknown;
    prepare(command: string, destination: number[], expiration: number, retry: number): Message;
    send(message: Message, payload: string): Promise<Message>;
    read(message: Message): Promise<Message[]>;
}

export { MessageBusClientInterface, Message };
