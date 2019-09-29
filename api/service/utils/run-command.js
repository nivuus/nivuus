/*
 * Copyright 2019 Allanic.me ISC License License
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 * Created by mallanic <maxime@allanic.me> at 18/08/2019
 */

const $systemInstaller = require('system-installer');
const $lodash = require('lodash');

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
    console.log($lodash.map(env, (v, k) => `${k}="${v}"`).join(' '), command, args.join(' '), );
    var output = '';
    return new Promise((resolve, reject) => {
        var result = require('child_process').spawn(command, args, { stdio: 'pipe' , env: env});
        result.on('error', (err) => { return reject(Error(err)); });
        result.stdout.on('data', function (data) { output += data.toString(); });
        result.stderr.on('data', function (data) {
            console.error(new Error(data.toString()));
        });
        resolve();
        //result.on('close', function (code) { return resolve(output) });
        result.on('exit', function (code) {
            console.log(output);
            console.log('exit', code, command);
        });


        function exitHandler(options, exitCode) {
            console.log('exit');
            result.kill('SIGINT')
            process.exit();
        }

        //do something when app is closing
        process.on('exit', exitHandler.bind(null,{cleanup:true}));

        //catches ctrl+c event
        process.on('SIGINT', exitHandler.bind(null, {exit:true}));

        // catches "kill pid" (for example: nodemon restart)
        process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
        process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));

        //catches uncaught exceptions
        process.on('uncaughtException', exitHandler.bind(null, {exit:true}));
    });
};