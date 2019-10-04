/*
 * Copyright 2019 Allanic.me ISC License License
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 * Created by mallanic <maxime@allanic.me> at 07/08/2019
 */

const $q = require('q');
const $fs = require('fs');
const $path = require('path');
const $glob = require('glob');
const $lodash = require('lodash');
const $installer = require('./service/utils/installer');
const $runCommand = require('./service/utils/run-command');
const Communicator = require('./communicator');
const $translator = require('./service/translator');

module.exports = class {
    constructor (module, path, injector, api) {
        this._api = api;
        this._definition = module;
        this._path = path;
        this._injector = injector;
        this._id = $lodash.uniqueId('id');
    }

    resolveFilePath(path) {
        return $path.resolve(this._path, path);
    }

    async getJavascriptDeclaration(io) {
        var moduleFile = '';
        var self = this;

        await $q.all($lodash.map(this._definition.sessionServices, async (sessionService, name) => {
            var communicator = new Communicator();
            io.on('connection', (socket) => {
                if (!socket._sessionServices)
                    socket._sessionServices = {};
                socket._sessionServices[ name ] = communicator.loadSessionModule(socket);
                /*communicator.loadModule(socket, (scope, onDestroy) => {
                    var sessionServices = self.getSessionServices(socket);
                    var destroy = self.loadController(scope, page.controller, sessionServices);
                    onDestroy(destroy);
                });*/
            });
            var communicatorDeclaration = await communicator.getDeclaration('self', 'self');
            moduleFile += `
                .provider('${name}', function () {
                    var self = {};

                    self.$on = function () {

                    };


                    return {
                        $get: function ($rootScope, $injector) {
                            self.$watchCollection = $rootScope.$watchCollection;
                            self.$watch = $rootScope.$watch;
                            self.$apply = function () {
                                return $rootScope.$apply();
                            };
                            $injector.invoke(${sessionService}, self);
                            ${ communicatorDeclaration }
                            return self;
                        }
                    };
                })
                .run(function (${name}) {

                })
            `;
        }));

        await $q.all($lodash.map(this._definition.widgets, async (element) => {
            var communicator = new Communicator();
            var component = $lodash.uniqueId('component');
            if (element.templateFile) {
                element.template = await $q.nfcall($fs.readFile, self.resolveFilePath(element.templateFile), 'utf8');
            }

            if (element.controller) {
                io.on('connection', (socket) => {
                    communicator.loadModule(socket, (scope, onDestroy) => {
                        var destroy = self.loadController(scope, element.controller, socket._sessionServices);
                        onDestroy(destroy);
                    });

                })
            }

            var communicatorDeclaration = await communicator.getDeclaration('$scope');
            moduleFile += `
                .directive('${ component }', function () {
                    return {
                        restrict: 'E',
                        template: \`${element.template}\`,
                        replace: true,
                        link: function ($scope) {
                            $scope._translateNamespace = '${$lodash.toUpper(self._id)}';
                            ${ communicatorDeclaration }
                        }
                    }
                })
                .run(function ($compile, $rootScope) {
                    var compiledElement = $compile(angular.element('<${component }></${ component}>'))($rootScope);
                    var parent = $('${element.position}');

                    if ('${element.after}'.length > 0 && parent.find('${element.after}').length > 0)
                        parent.find('${element.after}').after(compiledElement);
                    else
                        parent.prepend(compiledElement);
                })
            `;
        }));

        await $q.all($lodash.map(this._definition.pages, async (page, path) => {
            var communicator = new Communicator();
            page.name = $lodash.uniqueId('page_');
            if (page.templateFile)
                page.template = await $q.nfcall($fs.readFile, self.resolveFilePath(page.templateFile), 'utf8');
            if (page.controller) {
                io.on('connection', (socket) => {
                    communicator.loadModule(socket, (scope, onDestroy) => {
                        var sessionServices = socket._sessionServices;
                        var destroy = self.loadController(scope, page.controller, sessionServices);
                        onDestroy(destroy);
                    });
                })
            }
            var communicatorDeclaration = await communicator.getDeclaration('$scope', '$stateParams');
            moduleFile += `
                .config(function ($stateProvider) {
                    $stateProvider.state({
                        name: '${page.name}',
                        url: '${path}',
                        template: \`${page.template}\`,
                        params: ${page.params ? JSON.stringify(page.params) : null},
                        controller: function ($scope, $stateParams) {
                            $scope._translateNamespace = '${$lodash.toUpper(self._id)}';
                            ${ communicatorDeclaration }
                        }
                    });
                })
            `
        }));

        await $q.all($lodash.map(this._definition.services, async (service, name) => {
            var communicator = new Communicator();
            var scope = communicator.loadGlobalModule(io);
            self.loadController(scope, service);
            self._injector.add(name, function () {
                return scope;
            });
            var communicatorDeclaration = await communicator.getDeclaration('self', 'self', scope);
            moduleFile += `
                .service('${name}', function ($injector, $rootScope) {
                    var self = this;
                    self.$on = function () {

                    };
                    self.$watchCollection = $rootScope.$watchCollection;
                    self.$watch = $rootScope.$watch;
                    self.$apply = function () {
                        return $rootScope.$apply();
                    };
                    ${ communicatorDeclaration }
                })
            `
        }));

        await $q.all($lodash.map(this._definition.directives, async (element, name) => {
            moduleFile += `
                .directive('${ name }', ${element})
            `;
        }));


        return $q.resolve(moduleFile);
    }

    async getCssDeclaration() {
        var self = this;
        var css = this._definition.css || '';
        if (this._definition.theme) {
            await $q.all($lodash.map(this._definition.theme.cssFiles, async (cssFile) => {
                var output = await $q.nfcall($fs.readFile, self.resolveFilePath(cssFile), 'utf8');
                css += output;
            }));
        }
        return css;
    }

    getStatics() {
        var self = this;
        return $lodash.map(this._definition.statics, (staticFile, key) => {
            var httpPath;
            var path;
            if (typeof key === 'string') {
                httpPath = key;
                path = staticFile;
            }
            else {
                httpPath = staticFile;
                path = self.resolveFilePath(staticFile);
            }


            return {
                http: httpPath,
                path: path
            };
        });
    }

    loadController(scope, controller, additionalService) {
        try {
            this._injector.invoke(controller, additionalService, scope);
        } catch (e) {
            console.error(e);
        }
    }

    get(path) {
        return $lodash.get(this._definition, path, undefined);
    }
};