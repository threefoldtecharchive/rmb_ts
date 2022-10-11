// greeter service

import { Server } from "../src/server/service";

let server = new Server()

interface Person {
  name: string;
  greeting: string;
}


class Greeter {
  greet(name: string, age: number): Person {
    return {
      name: name,
      greeting: `Hello ${name}`
    }
  }
}

server.register(new Greeter())
server.run();
