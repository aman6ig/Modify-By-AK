const chalk = require('chalk');

/**
 * Logger utility for console messages with colors
 * @param {string} message - Message to log
 * @param {string} type - Type of message (warn, error, etc.)
 */
module.exports = (message, type) => {
  switch (type) {
    case 'warn':
      console.log(chalk.bold.hex('#FF00FF').bold('[ Warning ] » ') + message);
      break;
    case 'error':
      console.log(chalk.bold.hex('#ff334b').bold('[ Error ] » ') + message);
      break;
    default:
      console.log(chalk.bold.hex('#FF0000').bold(type + ' » ') + message);
      break;
  }
};

/**
 * Loader utility for startup messages
 * @param {string} message - Message to log
 * @param {string} type - Type of message (warn, error, etc.)
 */
module.exports.loader = (message, type) => {
  switch (type) {
    case 'warn':
      console.log(chalk.bold.hex('#b4ff33').bold('[ AMAN-BOT ] » ') + message);
      break;
    case 'error':
      console.log(chalk.bold.hex('#ff334b').bold('[ Error ] » ') + message);
      break;
    default:
      console.log(chalk.bold.hex('#33ffc9').bold('[ AMAN-BOT ] » ') + message);
      break;
  }
};
