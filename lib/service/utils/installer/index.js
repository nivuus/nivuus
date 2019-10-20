
const $lodash = require('lodash');
const $fs = require('fs');
const $q = require('q');

class SystemInstaller {
    constructor () {
        var platform = process.platform;
        var type;
        if (platform === 'linux') {
            var osRelease = $fs.readFileSync('/etc/os-release', 'utf8');
            var match = osRelease.match(/^ID\=\"?([^\"\n]+)\"?/m);
            type = match[ 1 ];
        }
        this._platform = `${ platform }-${ type }`;
        var Installer = require(`./${ this._platform }`);
        this._installer = new Installer();
    }

    async provideInstall(config) {
        if ($lodash.isString(config))
            return await this.install(config);

        if (!config[ this._platform ])
            throw new Error(`there is no ${ this._platform } configured for ${JSON.stringify(config)}`);

        config = config[ this._platform ];
        await this.addRepository(config);
        return await this.install(config.package);
    }

    async addRepository(config) {
        return await this._installer.addRepository(config);
    }

    async install(packageName) {
        if (!await this.isInstalled(packageName))
            return await this._installer.install(packageName);
    }

    isInstalled(packageName) {
        return this._installer.isInstalled(packageName);
    }
}

module.exports = new SystemInstaller();