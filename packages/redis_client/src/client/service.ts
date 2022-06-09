import { MessageBusClient } from "./client";


export interface Indexable {
  [key: string]: any
}


const DefaultPort = 6379;
const DefaultPrefix = "msgbus";
const DefaultExpiration = 3600;
const DefaultRetries = 5;

export class Client implements Indexable {
  [key: string]: any;
  client: MessageBusClient;
  twins: [number];
  expiration: number;
  retry: number;
  prefix: string;

  constructor(twins: [number], port = DefaultPort, prefix = DefaultPrefix, expiration = DefaultExpiration, retry = DefaultRetries) {
    this.client = new MessageBusClient(port);
    this.twins = twins;
    this.prefix = prefix;
    this.expiration = expiration;
    this.retry = retry;
  }

  async call(cmd: string, payload: string) {
    const msg = this.client.prepare(cmd, this.twins, this.expiration, this.retry)
    const preparedMsg = await this.client.send(msg, payload)

    const ret = await this.client.read(preparedMsg);
    // FIXME: should handle multiple responses from multiple destinations
    // assuming the result is always json and throws error if msg.err is set (and not dat is provided)
    return ret

  }

  register(service: Service) {
    service.client = this
    this[service._name] = service
  }
}




export class Service {
  client: Client | null;

  constructor() {
    this.client = null;
  }

  get _name() {
    return this.constructor.name.toLocaleLowerCase();
  }
}


export function cmd(target: Service, propertyKey: string, descriptor: PropertyDescriptor) {
  // Check of the decorated property is a function
  if (typeof descriptor.value === 'function') {
    // The function that we are going to wrap
    const fn = descriptor.value as Function;

    // Provide a new function for this property that wraps the original function
    descriptor.value = async function (...args: any) {
      // Call the method with `this` set the object with the method,
      // in case that matters.
      const self = this as Service;
      const fullCmd = `${self.client?.prefix}.${self._name}.${propertyKey}`;

      const result = await self.client?.call(fullCmd, JSON.stringify(args));
      console.log("result: ", result)
      return result
    }
  }
}

export function cmd2<T>() {
  return (target: Service, propertyKey: string, descriptor: PropertyDescriptor) => {
    // Check of the decorated property is a function
    if (typeof descriptor.value === 'function') {
      // The function that we are going to wrap
      const fn = descriptor.value as Function;

      // Provide a new function for this property that wraps the original function
      descriptor.value = async function (...args: any) {
        // Call the method with `this` set the object with the method,
        // in case that matters.
        const self = this as Service;
        const fullCmd = `${self.client?.prefix}.${self._name}.${propertyKey}`;

        const result = await self.client?.call(fullCmd, JSON.stringify(args));
        // console.log("result: ", result)
        try {
          const obj = JSON.parse(result)
          // FIXME: result is a record<string, unkown>[]
          // we should either parse all into <T>
          // or we better only to support a single destination per Client object?
          return obj as unknown as T
        } catch {
          return result;
        }
      }
    }
  }
}
