var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import redis from "redis";
import uuid4 from "uuid4";
class MessageBusClient {
    constructor(port = 6379) {
        const client = redis.createClient(port);
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
            ret: uuid4(),
            try: retry,
            shm: "",
            now: Math.floor(new Date().getTime() / 1000),
            err: "",
        };
    }
    send(message, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const buffer = Buffer.from(payload);
            message.dat = buffer.toString("base64");
            const request = JSON.stringify(message);
            this.client.lpush(["msgbus.system.local", request], redis.print);
            console.log(request);
            return message;
        });
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
export { MessageBusClient };
