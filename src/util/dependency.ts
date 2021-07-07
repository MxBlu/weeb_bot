import { Logger } from "./logger.js";

type ResolveFunction = (value: void | PromiseLike<void>) => void;

export class Dependency {

  public static async awaitMultiple(...dependencies: Dependency[]): Promise<void> {
    await Promise.all(dependencies.map(d => d.await));
  }

  // Name of the dependency
  name: string;
  // State of the dependency
  readyPromise: Promise<void>;
  // Functions waiting on the ready state
  resolve: ResolveFunction;
  
  logger: Logger;

  constructor(name: string) {
    this.name = name;
    this.readyPromise = new Promise<void>((resolve) => this.resolve = resolve);
    this.logger = new Logger(`Dependency.${name}`);
  }

  public async ready(): Promise<void> {
    this.logger.info(`Ready state triggered`, 4);
    this.resolve();
  }

  public async await(): Promise<void> {
    return this.readyPromise;
  }
}