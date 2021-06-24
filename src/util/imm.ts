/*
  Simple generic messaging bus
  Could I just have use Node.JS emitters? ...Yes probably, but I didn't think of it till I was done
  This has better logging for my sanity anyway
*/

// TODO: Properly test

import { Logger, LogLevels } from "./logger.js";

type EventCallbackFunction<T> = (data: T, topic: MessengerTopic<T>) => Promise<void>;

export class MessengerTopic<T> {
  // Topic name
  name: string
  // Universal logger instance
  logger: Logger;
  // Subscribed functions, to be called on event
  subscribers: Map<string, EventCallbackFunction<T>>;
  // Data from last event
  lastData: T;

  constructor(name: string) {
    this.name = name;
    this.logger = new Logger(`MessengerTopic.${name}`);
    this.subscribers = new Map<string, EventCallbackFunction<T>>();
    this.logger.info(`Topic generated`, LogLevels.INFO3);
  }

  // Add function as listener to this topic
  // Must be defined as a standard function, not an arrow function. Otherwise, func.name is null
  // Assumes topic does exist
  public subscribe(funcName: string, func: EventCallbackFunction<T>): void {
    if (this.subscribers.has(funcName)) {
      this.logger.error(`Function ${funcName} is already subscribed to Topic ${this.name}`);
      return;
    }

    this.subscribers.set(funcName, func);
    this.logger.info(`Function ${funcName} subscribed to Topic ${this.name}`, 3);
  }

  // Remove function from listeners
  // Assumes topic does exist
  public unsubscribe(funcName: string): void {
    if (!this.subscribers.has(funcName)) {
      this.logger.error(`Function ${funcName} was not subscribed to Topic ${this.name}`);
      return;
    }

    this.subscribers.delete(funcName);
    this.logger.info(`Function ${funcName} unsubscribed from Topic ${this.name}`, 3);
  }

  // Call all subscribed functions for a topic with provided data asynchronously
  // Assumes topic does exist
  public notify(data: T): void {
    this.logger.info(`Notifying topic ${this.name}`, 3);
    this.lastData = data;
    this.subscribers.forEach( async (f) => {
      f(data, this);
    });
  }

  // Get the last data that was added to the topic
  // Assumes topic does exist
  public getLastData(): T {
    return this.lastData;
  }
}