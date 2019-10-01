/*
 * Copyright 2019 Allanic.me ISC License License
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 * Created by mallanic <maxime@allanic.me> at 01/10/2019
 */

const $q = require('q');
const $childProcess = require('child_process');
const $fs = require('fs');

module.exports = class DebianInstaller {
    install(packageName) {
        var deferred = $q.defer();
        $childProcess.exec(`apt install -y ${ packageName }`, {
            env: {
                DEBIAN_FRONTEND: 'noninteractive',
                PATH: process.env.PATH
            }
        }, function (error, stdout, stderr) {
                if (error)
                    deferred.reject(error);
                else
                    deferred.resolve();
        });
        return deferred.promise;
    }

    isInstalled(packageName) {
        var deferred = $q.defer();
        $childProcess.exec(`apt -qq list ${ packageName }`, function (error, stdout, stderr) {
            if (error)
                return deferred.reject(error);
            if (stdout.match(/\[installed\]$/m))
                return deferred.resolve(true);
            return deferred.resolve(false);
        });
        return deferred.promise;
    }

    async addRepository(config) {
        if ($fs.existsSync(`/etc/apt/sources.list.d/${ config.name }.list`))
            return;

        await $q.nfcall($childProcess.exec, `curl '${ config.key }' | sudo apt-key add -`);
        await $q.nfcall($childProcess.exec, `echo deb '${ config.repository }' > /etc/apt/sources.list.d/${ config.name }.list`);
        await $q.nfcall($childProcess.exec, 'apt update');
    }
}