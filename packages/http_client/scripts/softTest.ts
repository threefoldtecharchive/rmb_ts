import { HTTPMessageBusClient } from "../src/httpClient";

function delay(s: number) {
    return new Promise(resolve => setTimeout(resolve, s * 1000));
}

async function main() {
    const dstNodeId = 44;

    async function deploy() {
        const rmb = new HTTPMessageBusClient("https://rmbproxy1.devnet.grid.tf");
        const msg = rmb.prepare("zos.statistics.get", [dstNodeId], 0, 2);
        const retMsg = await rmb.send(msg, "{'test':'test'}");
        // set the retqueue to oringnal message
        await delay(7);

        const result = await rmb.read(retMsg);
        console.log(`the read response is:`);
        console.log(result);
    }

    deploy();
}

main();
