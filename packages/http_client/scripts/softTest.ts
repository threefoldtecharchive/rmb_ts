import { HTTPMessageBusClient } from "../src/httpClient";

function delay(s: number) {
    return new Promise(resolve => setTimeout(resolve, s * 1000));
}

async function main() {
    const dstNodeId = 127;

    async function deploy() {
        const rmb = new HTTPMessageBusClient(133, "http://localhost:8055", "https://graphql.dev.grid.tf/graphql", "behave element congress universe grit door reform noise fringe relax shop analyst");
        rmb.verifyResponse = true;
        const msg = rmb.prepare("zos.statistics.get", [dstNodeId], 1000, 2);
        const retMsg = await rmb.send(msg, "{'test':'test'}");
        // set the retqueue to oringnal message
        await delay(3);

        const result = await rmb.read(retMsg);
        console.log(`the read verified response is:`);
        console.log(result);
    }

    deploy();
}

main();
