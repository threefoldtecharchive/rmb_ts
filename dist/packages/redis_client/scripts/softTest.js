"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("../src/client");
async function main() {
    const dstNodeId = 4;
    async function deploy() {
        const rmb = new client_1.MessageBusClient();
        const msg = rmb.prepare("zos.statistics.get", [dstNodeId], 0, 2);
        console.log(msg);
        const retMsg = await rmb.send(msg, "{'test':'test'}");
        console.log(retMsg);
        const result = await rmb.read(retMsg);
        console.log(`the read response is: ${JSON.stringify(result)}`);
    }
    deploy();
}
main();
//# sourceMappingURL=softTest.js.map