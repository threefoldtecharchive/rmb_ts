import { MessageBusServer } from "./server";



const DefaultPort = 6379;
const DefaultPrefix = "msgbus";


export class Server {
  bus: MessageBusServer;
  prefix: string;
  services: any[];

  constructor(port = DefaultPort, prefix = DefaultPrefix) {
    this.bus = new MessageBusServer(port);
    this.services = [];
    this.prefix = prefix;
  }

  getMethodNames(service: any): string[] {
    let names: string[] = [];

    Object.getOwnPropertyNames(Object.getPrototypeOf(service)).forEach((prop) => {
      if (prop === 'constructor') {
        return
      }

      if (typeof service[prop] === 'function') {
        names.push(prop)
      }
    });

    return names;
  }

  wrapMethod(method: Function) {
    return async function (_: any, payload: string) {
      const args = JSON.parse(payload)
      return method(...args)
    }
  }

  register(service: any) {
    const name = service.constructor.name.toLocaleLowerCase();
    const methods = this.getMethodNames(service);

    if (!methods.length) {
      throw RangeError("this service don't have any methods to register")
    }

    for (const methodName of methods) {
      const topic = `${this.prefix}.${name}.${methodName}`;
      const method: Function = service[methodName];
      this.bus.withHandler(topic, this.wrapMethod(method));
    }

    this.services.push(service)
  }

  run() {
    this.bus.run()
  }

}
