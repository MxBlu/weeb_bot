/*
  Simple logging assistant
  Mostly for the job of appending timestamps
  Also logs errors to Discord if available
*/

// Get a time string of the current time
const getTime = () => {
	var now = new Date();

	var hrs = now.getHours().toString().padStart(2, '0');
	var min = now.getMinutes().toString().padStart(2, '0');
	var sec = now.getSeconds().toString().padStart(2, '0');

	return `${hrs}:${min}:${sec}`;
}

// Initialise with desired verbosity target
module.exports = (v) => {
  // Messenger for Discord error logging
	var imm = null;

	return {

    // Generic log event, lower verbosity is higher priority
    // Default to verbosity = 1
		info: (message, verbosity = 1) => {
			if (v >= verbosity) {
				console.log(`[INFO${verbosity}] ${getTime()} ${message}`);
			}
		},

    // Log event as error, where verbosity = 0
    // Logs to Discord if available
		error: (message) => {
			if (v >= 0) {
				var logStr = `[ERROR] ${getTime()} ${message}`;
				console.error(logStr);
				if (imm != null)
					imm.notify('newErrorLog', logStr);
			}
		},

    // Register messenger for Discord logging
		registerMessenger: (messenger) => {
			imm = messenger;
		}
	
  	}
}