import EventEmitter from "events";
import { DEFAULT_LOG_LEVEL } from "./constants/constants.js";
import { LogLevel } from "./constants/log_levels.js";

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
  loggerVerbosity: LogLevel;

  constructor(name: string, loggerVerbosity = DEFAULT_LOG_LEVEL) {
    this.name = name;
    this.loggerVerbosity = loggerVerbosity;
  }

  // Log to console, and publish to NewLog emitter
  public log(message: string, verbosity: LogLevel): void {
    // Only log events above our specified verbosity
    if (this.loggerVerbosity >= verbosity) {
      const verbosityStr = LogLevel[verbosity];
      const logStr = `${getTimeString()} ${`[${this.name}]`.padStart(40)} ${`[${verbosityStr}]`.padStart(7)} ${message}`;
      // Log ERROR to stderr, rest to stdout
      if (verbosity == LogLevel.ERROR) {
        console.error(logStr);
      } else {
        console.log(logStr);
      }
      // Publish event to emitter
      NewLogEmitter.emit(verbosityStr, logStr);
    }
  }

  // Log event as ERROR
  public error(message: string): void {
    this.log(message, LogLevel.ERROR);
  }

  // Log event as WARN
  public warn(message: string): void {
    this.log(message, LogLevel.WARN);
  }

  // Log event as INFO
  public info(message: string): void {
    this.log(message, LogLevel.INFO);
  }

  // Log event as DEBUG
  public debug(message: string): void {
    this.log(message, LogLevel.DEBUG);
  }
  
  // Log event as TRACE
  public trace(message: string): void {
    this.log(message, LogLevel.TRACE);
  }

}

// Message topic for logging events
export const NewLogEmitter = new EventEmitter();