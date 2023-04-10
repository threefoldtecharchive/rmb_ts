interface IncomingRequest {
    ver: number,
    ref: string,
    src: string,
    cmd: string,
    exp: number,
    dat: string,
    tag: string,
    ret: string,
    shm: string,
    now: number,
}


interface Error {
    code: number,
    message: string
}

interface OutgoingResponse {
    ver: number,
    ref: string,
    dat: string,
    dst: string,
    shm: string,
    now: number,
    err: Error | null,
}

interface OutgoingRequest {
    ver: number,
    ref: string,
    cmd: string,
    exp: number,
    dat: string,
    tag: string,
    dst: number[],
    ret: string,
    shm: string,
    now: number,
}


interface IncomingResponse {
    ver: number,
    ref: string,
    dat: string,
    src: string,
    shm: string,
    now: number,
    err: Error | null,
}


export {
    Error,
    IncomingRequest,
    IncomingResponse,
    OutgoingRequest,
    OutgoingResponse
}
