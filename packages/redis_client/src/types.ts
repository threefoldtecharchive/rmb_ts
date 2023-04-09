interface JsonIncomingRequest {
    ver: number,
    ref: String,
    src: String,
    cmd: string,
    exp: number,
    dat: string,
    tag: String,
    ret: string,
    shm: string,
    now: number,
}


interface JsonError {
    code: number,
    message: String
}

interface JsonOutgoingResponse {
    ver: number,
    ref: String,
    dat: string,
    dst: String,
    shm: string,
    now: number,
    err: JsonError | null,
}
