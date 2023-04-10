interface JsonIncomingRequest {
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


interface JsonError {
    code: number,
    message: string
}

interface JsonOutgoingResponse {
    ver: number,
    ref: string,
    dat: string,
    dst: string,
    shm: string,
    now: number,
    err: JsonError | null,
}

interface JsonOutgoingRequest {
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


interface JsonIncomingResponse {
    ver: number,
    ref: string,
    dat: string,
    src: string,
    shm: string,
    now: number,
    err: JsonError | null,
}


export {
    JsonError,
    JsonIncomingRequest,
    JsonIncomingResponse,
    JsonOutgoingRequest,
    JsonOutgoingResponse
}
