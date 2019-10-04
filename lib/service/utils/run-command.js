/*
 * Copyright 2019 Allanic.me ISC License License
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 * Created by mallanic <maxime@allanic.me> at 18/08/2019
 */

const $systemInstaller = require('system-installer');
const $childProcess = require('child_process');
const $lodash = require('lodash');
const $event = require('./event');
const $logger = require('./logger').categorize('system-service');

module.exports = function (command) {
    var env = {};
    if ($lodash.isObject(command)) {
        var manager = $systemInstaller.packager();
        switch (manager.packager) {
            case 'apt-get':
                command = command.debian;
                break;
            default:
                throw new Error('unsupported system');
        }
    }

    if ($lodash.isObject(command)) {
        env = command.env || {};
        command = command.command;
    }

    var args = command.match(/(?=\S)[^"\s]*(?:"[^\\"]*(?:\\[\s\S][^\\"]*)*"[^"\s]*)*/g);
    args = $lodash.map(args, (arg) => $lodash.trim(arg, '"\''));
    var command = args.shift().replace(/\s/g, '\\ ');
    var output = '';
    $logger.info(`start ${ command }`);
    var result = $childProcess.spawn(command, args, {
        stdio: 'pipe',
        env: env,
        shell: true
    });
    result.on('error', (err) => {
        $logger.error(new Error(`${command } ${err.toString()}`));
    });
    result.stdout.on('data', function (data) {
        $logger.debug(command, data.toString().replace(/\n\s*\n/g, '\n'));
        output += data.toString();
    });
    result.stderr.on('data', function (data) {
        $logger.error(new Error(`${command } ${data.toString()}`));
    });
    //result.on('close', function (code) { return resolve(output) });
    result.on('exit', function (code) {
        $logger.debug(`${command} exit with ${code}`);
    });

    $event.on('exit', () => {
        result.kill();
    });
};