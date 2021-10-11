"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageBusClient = void 0;
const redis_1 = __importDefault(require("redis"));
const uuid4_1 = __importDefault(require("uuid4"));
class MessageBusClient {
    client;
    constructor(port = 6379) {
        const client = redis_1.default.createClient(port);
        client.on("error", function (error) {
            console.error(error);
        });
        this.client = client;
    }
    prepare(command, destination, expiration, retry) {
        return {
            ver: 1,
            uid: "",
            cmd: command,
            exp: expiration,
            dat: "",
            src: 0,
            dst: destination,
            ret: (0, uuid4_1.default)(),
            try: retry,
            shm: "",
            now: Math.floor(new Date().getTime() / 1000),
            err: "",
        };
    }
    async send(message, payload) {
        const buffer = Buffer.from(payload);
        message.dat = buffer.toString("base64");
        const request = JSON.stringify(message);
        this.client.lpush(["msgbus.system.local", request], redis_1.default.print);
        console.log(request);
        return message;
    }
    read(message) {
        return new Promise((resolve, reject) => {
            console.log("waiting reply", message.ret);
            const responses = [];
            this.client.blpop(message.ret, 0, function (err, reply) {
                if (err) {
                    console.log(`err while waiting for reply: ${err}`);
                    reject(err);
                }
                const response = JSON.parse(reply[1]);
                response["dat"] = Buffer.from(response["dat"], "base64").toString("ascii");
                responses.push(response);
                const msgDst = message.dst;
                // checking if we have all responses
                if (responses.length == msgDst.length) {
                    resolve(responses);
                }
            });
        });
    }
}
exports.MessageBusClient = MessageBusClient;
