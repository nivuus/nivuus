/*
 * Copyright 2019 Allanic.me ISC License License
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 * Created by mallanic <maxime@allanic.me> at 09/08/2019
 */

const $fs = require('fs');
const $path = require('path');
const $glob = require('glob');
const $q = require('q-native');
const $lodash = require('lodash');
const Git = require('nodegit');
const $utils = require('./service/utils');
const $installer = require('./service/utils/installer');
const $runCommand = require('./service/utils/run-command');
const Injector = require('./injector');
const Communicator = require('./communicator');
const ModuleApi = require('./module-api');

module.exports = class {
    constructor (path) {
        this._modulePath = path;
        if (!$fs.existsSync(this._modulePath)) {
            $fs.mkdirSync(this._modulePath, '0744');
        }
        this._modules = {};
        this._injector = new Injector();
        this._injector.add('$utils', function () {
            return $utils;
        });
        var self = this;
        this._injector.add('$modules', function () {
            return self;
        });
    }

    load(name) {

        if (name) {
            var matcher = name.match(/\/(([^\/]*)\/([^\/]*))$/);
            var api = new ModuleApi(require(name), name, this._injector, this);
            this._modules[ matcher[1] ] = api;
            return api.onLoaded;
        }
        var self = this;
        var finder = `{${ this._modulePath },${ __dirname }/component}/*/!(*.old)`;

        return $q.nfcall($glob, finder)
            .then((files) => {
                return $q.all($lodash.map(files, (file) => {
                    return self.load(file);
                }));
            });
    }

    unload(name) {
        if (name) {
            delete this._modules[ name ];
            return $q.resolve();
        }
        this._modules = {};
        return $q.resolve();
    }

    isInstalled(name) {
        return !!this._modules[ name ];
    }

    install(repository) {
        var self = this;
        var matcher = repository.match(/([^\/]+)\/([^\/]+)/);
        var namespacePath = $path.resolve(this._modulePath, matcher[1]);
        if (!$fs.existsSync(namespacePath))
            $fs.mkdirSync(namespacePath);

        var modulePath = $path.resolve(this._modulePath, repository);
        return Git.Clone(`https://github.com/${ repository }`, modulePath)
            .then(() => {
                return self.load(modulePath);
            });
    }

    uninstall(repository) {
        this.unload(repository);
        return $utils.rmDirectory($path.resolve(this._modulePath, repository));
    }

    getJavascriptDeclaration(io) {
        var moduleFile = `
            var parseValue = ${Communicator.parse};
            var formatValue = ${Communicator.format};
            var translations =
            angular.module('default-app', [
                'ui.router',
                'ui.bootstrap',
                'ngTouch'
            ])
                .config(function ($locationProvider) {
                    $locationProvider
                            .html5Mode(true);
                })
            `;
        var promises = $lodash.map(this._modules, (module) => {
            return module.getJavascriptDeclaration(io);
        });

        return $q.all(promises)
            .then(moduleFiles => {
                return moduleFile + moduleFiles.join('\n');
            });
    }

    getCssDeclaration() {
        return $q.all($lodash.map(this._modules, (module) => {
            return module.getCssDeclaration();
        }))
            .then((csss) => {
                return csss.join('\n')
            });
    }

    getStatics() {
        var statics = [];
        $lodash.forEach(this._modules, (module) => {
            $lodash.forEach(module.getStatics(), (staticFile) => statics.push(staticFile));
        });
        return statics;
    }

    forEach(callback) {
        $lodash.forEach(this._modules, callback);
    }

    map(callback) {
        return $lodash.map(this._modules, callback);
    }

    loadSystemPackages() {
        return $lodash.reduce(this._modules, (promise, module) => {
            var systemPackages = module.get('systemPackages');
            if (!systemPackages)
                return promise;
            return promise.then(function () {
                return $lodash.reduce($lodash.castArray(systemPackages), (promise, systemPackage) => {
                    return promise.then(function () {
                        return $installer.provideInstall(systemPackage);
                    });
                }, $q.resolve());
            });
        }, $q.resolve());
    }

    loadSystemServices() {
        return $q.all($lodash.map(this._modules, (module) => {
            var systemServices = module.get('systemServices');
            if (!systemServices)
                return $q.resolve();
            return $q.all($lodash.map($lodash.castArray(systemServices), (service) => {
                return $runCommand(service);
            }));
        }));
    }
}