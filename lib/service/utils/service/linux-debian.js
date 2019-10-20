/*
 * Copyright 2019 Allanic.me ISC License License
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 * Created by mallanic <maxime@allanic.me> at 04/10/2019
 */

const $q = require('q');
const $childProcess = require('child_process');
const $fs = require('fs');
const $lodash = require('lodash');
const $which = require('which');

module.exports = class DebianService {
    start(packageName) {
        var deferred = $q.defer();
        if (packageName.indexOf(' ') !== -1)
            packageName = packageName.substring(0, packageName.indexOf(' '));

        console.log(packageName);
        $childProcess.exec(`service ${ packageName } start`, function (error, stdout, stderr) {
            if (error)
                deferred.reject(error);
            else
                deferred.resolve();
        });
        return deferred.promise;
    }

    stop(name) {

    }

    restart(name) {

    }

    add(config) {
        var packageName;
        if ($lodash.isString(config)
            && config.indexOf(' ') !== -1) {
            packageName = config.substring(0, config.indexOf(' '));
        }
        else if ($lodash.isString(config))
            packageName = config;
        else
            packageName = config.packageName;


        var deferred = $q.defer();
        $childProcess.exec(`service ${ packageName } status`, async function (error, stdout, stderr) {
            if (error) {
                var packagePath = $which.sync(packageName).replace(packageName, '');
                console.log(packagePath);
                $q.nfcall($fs.writeFile, `/etc/systemd/system/${ packageName }.service`, `
                [Unit]
                Description=Autogenerate Service for ${ packageName }
                After=network.target auditd.service

                [Service]
                ExecStart=${ packagePath}${config}
                Type=simple
                Restart=on-failure

                [Install]
                WantedBy=multi-user.target
                `.replace(/\n\s*/g, '\n').replace(/^[\n\s]*/, ''), {
                    mode: 0o755,
                    encoding: 'utf8'
                })
                    .then(() => {
                        $childProcess.exec(`systemctl enable ${packageName}`, function (error, stdout, stderr) {
                            if (error)
                                deferred.reject(error);
                            else
                                deferred.resolve();
                        });
                    }, deferred.reject);
            }
            else
                deferred.resolve();
        });
        return deferred.promise;
    }
}