
const $systemInstaller = require('system-installer');
const $lodash = require('lodash');
const $childProcess = require('child_process');
const $os = require('os');
const $q = require('q-native');

module.exports = (name) => {
    if ($lodash.isObject(name)) {
        var manager = $systemInstaller.packager();

        switch (manager.packager) {
            case 'apt-get':
                $childProcess.execSync(`curl '${ name.debian.key }' | sudo apt-key add -`);
                $childProcess.execSync(`echo deb '${ name.debian.repository }' > /etc/apt/sources.list.d/${ name.debian.name }.list`);
                $childProcess.execSync('apt-get update');
                $childProcess.execSync(`apt-get install -y ${ name.debian.package }`, {
                    env: {
                        DEBIAN_FRONTEND: 'noninteractive'
                    }
                });
                return $q.resolve();
        }
    }
    else
        return $systemInstaller.installer(name);
}