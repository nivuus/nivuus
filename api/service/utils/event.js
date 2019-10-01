/*
 * Copyright 2019 Allanic.me ISC License License
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 * Created by mallanic <maxime@allanic.me> at 01/10/2019
 */

const Event = require('events');
const $logger = require('./logger');

module.exports = new Event();

function exitHandler(signal, exitCode) {
    module.exports.emit('exit', exitCode);
    process.exit(exitCode);
}

//do something when app is closing
process.on('exit', exitHandler.bind(null, null));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, 'SIGINT'));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, 'SIGUSR1'));
process.on('SIGUSR2', exitHandler.bind(null, 'SIGUSR2'));

//catches uncaught exceptions
process.on('uncaughtException', (error) => {
    $logger.error(error);
    exitHandler(null, null);
});