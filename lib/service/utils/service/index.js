/*
 * Copyright 2019 Allanic.me ISC License License
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 * Created by mallanic <maxime@allanic.me> at 04/10/2019
 */

const $lodash = require('lodash');
const $fs = require('fs');
const $q = require('q');

class SystemService {
    constructor () {
        var platform = process.platform;
        var type;
        if (platform === 'linux') {
            var osRelease = $fs.readFileSync('/etc/os-release', 'utf8');
            var match = osRelease.match(/^ID\=\"?([^\"\n]+)\"?/m);
            type = match[ 1 ];
        }
        this._platform = `${ platform }-${ type }`;
        var ServiceManager = require(`./${ this._platform }`);
        this._serviceManager = new ServiceManager();
    }

    async start(name) {
        return this._serviceManager.start(name);
    }

    async stop(name) {
        return this._serviceManager.stop(name);
    }

    async restart(name) {
        return this._serviceManager.restart(name);
    }

    async add(config) {
        return this._serviceManager.add(config);
    }
}

module.exports = new SystemService();