import { MessageBusClient } from "../src/client";
import { Service, cmd, Client, cmd2 } from "../src/client/service";

interface Person {
    name: string;
    greeting: string;
}

class Greeter extends Service {
    @cmd2<Person>()
    greet(name: string, age: number): Person {
        return {
            name: "",
            greeting: "",
        }
    };
}




async function main() {
    // const dstNodeId = 4;

    // async function deploy() {
    //     const rmb = new MessageBusClient();
    //     const msg = rmb.prepare("zos.statistics.get", [dstNodeId], 0, 2);
    //     console.log(msg);
    //     const retMsg = await rmb.send(msg, "{'test':'test'}");
    //     console.log(retMsg);

    //     const result = await rmb.read(retMsg);
    //     console.log(`the read response is: ${JSON.stringify(result)}`);
    // }

    // deploy();.

    let cl = new Client([114])
    cl.register(new Greeter())
    await cl.greeter.greet("abdo", 1)

}

main();
