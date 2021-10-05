import { HTTPMessageBusClient } from "../src/httpClient";

function delay(s: number) {
    return new Promise(resolve => setTimeout(resolve, s * 1000));
}

async function main() {
    const dstNodeId = 4;

    async function deploy() {
        const rmb = new HTTPMessageBusClient("https://rmbproxy1.devnet.grid.tf");
        const msg = rmb.prepare("zos.statistics.get", [dstNodeId], 0, 2);
        console.log(msg);
        const retMsg = await rmb.send(msg, "{'test':'test'}");
        console.log(retMsg);
        // set the retqueue to oringnal message
        await delay(7);

        const result = await rmb.read(retMsg);
        console.log(`the read response is: ${JSON.stringify(result)}`);
    }

    deploy();
}

main();
