import { DEFAULT_LOG_LEVEL } from "../constants/constants.js";
import { MessengerTopic } from "./imm.js";

export const enum LogLevels {
  IGNORE = -1,
  ERROR,
  INFO1,
  INFO2,
  INFO3,
  INFO4
}

// Get a time string of the current time
function getTimeString() {
  const now = new Date();

  const hrs = now.getHours().toString().padStart(2, '0');
  const min = now.getMinutes().toString().padStart(2, '0');
  const sec = now.getSeconds().toString().padStart(2, '0');

  return `${hrs}:${min}:${sec}`;
}

/*
  Simple logging assistant
  Mostly for the job of appending timestamps
  Also logs errors to Discord if available
*/
export class Logger {
  // Name to append on to logs
  name: string;
  // Min verbosity for a log message to be processed
  loggerVebosity: number;

  constructor(name: string, loggerVebosity = DEFAULT_LOG_LEVEL) {
    this.name = name;
    this.loggerVebosity = loggerVebosity;
  }

  // Generic log event, lower verbosity is higher priority
  // Default to verbosity = 1
  public info(message: string, verbosity = LogLevels.INFO1): void {
    if (this.loggerVebosity >= verbosity) {
      console.log(`${getTimeString()} - [INFO${verbosity}] ${this.name} - ${message}`);
    }
  }

  // Log event as error, where verbosity = 0
  // Logs to Discord if available
  public error (message: string): void {
    if (this.loggerVebosity >= LogLevels.ERROR) {
      const logStr = `${getTimeString()} - [ERROR] ${this.name} - ${message}`;
      console.error(logStr);
      // Log to Discord if it happens to be listening
      NewErrorLogTopic.notify(logStr);
    }
  }

}

// Message topic for Discord error logging
export const NewErrorLogTopic = new MessengerTopic<string>("newErrorLog");