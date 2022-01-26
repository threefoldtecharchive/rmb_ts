# rmb-http-client
Threefold RMB client using HTTP

## Installation

```bash
npm i ts-rmb-http-client
```

## Example usage

```js
import { HTTPMessageBusClient } from "ts-rmb-http-client";

async function main() {
    const dstNodeId = 4;

    async function deploy() {
        const rmb = new HTTPMessageBusClient(3, "https://gridproxy.test.grid.tf", "https://graphql.dev.grid.tf/graphql", "<mnemonics>");
        const msg = rmb.prepare("zos.statistics.get", [dstNodeId], 0, 2);
        const retMsg = await rmb.send(msg, "{'test':'test'}");

        const result = await rmb.read(retMsg);
        console.log(`the read response is:`);
        console.log(result);
    }

    deploy();
}

main();

```
