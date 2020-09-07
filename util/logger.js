const getTime = () => {
	var now = new Date();

	var hrs = now.getHours().toString().padStart(2, '0');
	var min = now.getMinutes().toString().padStart(2, '0');
	var sec = now.getSeconds().toString().padStart(2, '0');

	return `${hrs}:${min}:${sec}`;
}

module.exports = (v) => {
	var imm = null;

	return {

		info: (message, verbosity = 1) => {
			if (v >= verbosity) {
				console.log(`[INFO${verbosity}] ${getTime()} ${message}`);
			}
		},

		error: (message) => {
			if (v >= 0) {
				var logStr = `[ERROR] ${getTime()} ${message}`;
				console.log(logStr);
				if (imm != null)
					imm.notify('newErrorLog', logStr);
			}
		},

		registerMessenger: (messenger) => {
			imm = messenger;
		}
    
  	}
}