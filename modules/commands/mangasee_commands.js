const { sendCmdMessage, isAdmin } = require("../../util/bot_utils");
const { parseUrl } = require("../../util/urlparser");

module.exports = (db, imm, logger) => {
  return {

    mangaseestatusHandler: async (command) => {
      let status = null;
      switch (command.arguments.length) {
      case 0:
        // Handle as "get current parsing status"
        status = await db.isMangaseeEnabled();
        const explicitlyDisabled = process.env.MANGASEE_DISABLED == 'true';
        if (explicitlyDisabled == true) {
          sendCmdMessage(command.message, 'Mangasee parser is explicitly disabled', 2, logger);
        } else if (status == true) {
          sendCmdMessage(command.message, 'Mangasee parser is enabled', 2, logger);
        } else {
          sendCmdMessage(command.message, 'Mangasee parser is disabled', 2, logger);
        }
        return;
      case 1:
        // Handle as "set parsing status"
        // Admin only
        if (! await isAdmin(command.message)) {
          sendCmdMessage(command.message, 'Error: not admin', 2, logger);
          return;
        }

        status = command.arguments[0] == 'true';
        await db.setMangaseeEnabled(status);
        sendCmdMessage(command.message, `Mangasee parsing status updated to ${status}`, 2, logger);
        return;
      default:
        sendCmdMessage(command.message, 'Error: incorrect argument count', 3, logger);
        return;
      }
    },

    getaliasesHandler: async (command) => {
      let titleObj = null;
      switch (command.arguments.length) {
      case 1:
        try {
          titleObj = await parseUrl(db, command.arguments[0]);
        } catch (e) {
          logger.info(`Error parsing URL: ${e}`);
        }

        break;
      default:
        sendCmdMessage(command.message, 'Error: incorrect argument count', 3, logger);
        return;
      }

      // Ensure we got a valid manga url
      if (titleObj == null) {
        sendCmdMessage(command.message, 'Error: bad title URL', 3, logger);
        return;
      }

      const altTitles = await db.getAltTitles(titleObj.id);
      let str = `**${titleObj.title}**:\n` +
                  Array.from(altTitles.values()).join('\n');
      sendCmdMessage(command.message, str, 3, logger);
    },

    addaliasHandler: async (command) => {
      let titleObj = null;
      let altTitle = null;
      switch (command.arguments.length) {
      case 0:
      case 1:
        sendCmdMessage(command.message, 'Error: incorrect argument count', 3, logger);
        return;
      default:
        try {
          titleObj = await parseUrl(db, command.arguments[0]);
        } catch (e) {
          logger.info(`Error parsing URL: ${e}`);
        }

        // Recombine all arguments after the first into one
        altTitle = command.arguments.slice(1).join(' ');

        break;
      }

      // Ensure we got a valid manga url
      if (titleObj == null) {
        sendCmdMessage(command.message, 'Error: bad title URL', 3, logger);
        return;
      }

      await db.addAltTitle(titleObj.id, altTitle);
      sendCmdMessage(command.message, `Added alt title '${altTitle}' to '${titleObj.title}'`, 2, logger);
    },

    delalttitleHandler: async (command) => {
      let titleObj = null;
      let altTitle = null;
      switch (command.arguments.length) {
      case 0:
      case 1:
        sendCmdMessage(command.message, 'Error: incorrect argument count', 3, logger);
        return;
      default:
        try {
          titleObj = await parseUrl(db, command.arguments[0]);
        } catch (e) {
          logger.info(`Error parsing URL: ${e}`);
        }

        // Recombine all arguments after the first into one
        altTitle = command.arguments.slice(1).join(' ');

        break;
      }

      // Ensure we got a valid manga url
      if (titleObj == null) {
        sendCmdMessage(command.message, 'Error: bad title URL', 3, logger);
        return;
      }

      await db.delAltTitle(titleObj.id, altTitle);
      sendCmdMessage(command.message, `Removed alt title '${altTitle}' to '${titleObj.title}'`, 2, logger);
    }

  }
}