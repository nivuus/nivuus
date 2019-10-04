/*
 * Copyright 2019 Allanic.me ISC License License
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 * Created by mallanic <maxime@allanic.me> at 03/09/2019
 */

const $lodash = require('lodash');
const Q = require('q');
const $logger = require('./service/utils/logger');
const _ = $lodash;

module.exports = class Communicator {
    constructor () {
        this.id = $lodash.uniqueId();
    }

    async getDeclaration(varBind, initialValues, defaultValues) {
        var self = this;
        var js = `
            var previousValue = {};
            function emitAllValue(vars) {
                Q.all(_.map(vars, function (value, name) {
                    if (name[0] != '$'
                        && previousValue[name] !== vars[name]) {
                        return parseValue(value)
                            .then((value) => {
                                return {
                                    name: name,
                                    value: value
                                };
                            });
                    }
                }))
                    .then(function (args) {
                        var data = {};
                        _.forEach(args, function (arg) {
                            if (arg)
                                data[arg.name] = arg.value;
                        });
                        socket.emit('${this.id}', {
                            action: 'start',
                            value: data
                        });
                    });
            }
            emitAllValue(${initialValues});

            ${varBind}.$on('$destroy', function () {
                socket.emit('${this.id}', {
                    action: 'end'
                });
            });

            socket.on('connect', function () {
                emitAllValue(${varBind});
            })

            socket.on('${this.id}', function (data) {
                if (data.action === 'set')
                    formatValue(data.value, data.type, data.name, socket, '${this.id}')
                        .then(function (value) {
                            ${varBind}[data.name] = value;
                            previousValue[data.name] = value;
                            ${varBind}.$apply();
                        });
                else if (data.action === 'call') {
                    Q.all(_.map(data.arguments, (arg) => {
                        return formatValue(arg.value, arg.type, arg.name, socket, self.id, function () {
                            ${varBind}.$apply();
                        });
                    }))
                            .then((args) => {
                                if (!${ varBind }[ data.name ])
                                    return socket.emit(data.response, null);
                                var result = ${ varBind }[ data.name ].apply(null, args);
                                parseValue(result)
                                    .then(function (result) {
                                        socket.emit(data.response, result);
                                    })

                            });
                }
            });

            ${varBind}.$watchCollection(function () {
                var d = {};
                _.assign(d, ${varBind});
                return d;
            }, function (b) {
                if (previousValue)
                    _.forEach(${varBind}, function (value, name) {
                        if (name[0] != '$'
                            && previousValue[name] !== ${varBind}[name]) {
                            parseValue(value)
                                .then((value) => {
                                    value.action = 'set';
                                    value.name = name;
                                    socket.emit('${this.id}', value);
                                })

                        }
                    });

                previousValue = _.clone(${varBind});
            });
        `
        if (defaultValues)
            await Q.all($lodash.map(defaultValues, async (value, key) => {
                if (typeof value === 'function') {

                    value = await module.exports.parse(value);

                    js += `
                        (function () {
                            var data = ${JSON.stringify(value)};

                            var p = formatValue(data.value, data.type, '${ key }', socket, '${ this.id}', function () {
                                ${varBind}.$apply();
                            })
                                .then(function (value) {
                                    ${ varBind }['${ key }'] = value;
                                    return Q.resolve(value);
                                });

                            if (data.type === 'function') {
                                ${ varBind }['${ key }'] = function () {
                                    var args = arguments;
                                    return p.then(function (result) {
                                        return result.apply(null, args);
                                    });
                                };
                            }
                        })();`

                }

            }));
        return js;
    }

    loadSessionModule(socket) {
        var self = this;

        var originalScope = {};
        var sockets = [];
        var scope = new Proxy(originalScope, {
            get: (obj, prop) => {
                return obj[ prop ];
            },
            set: (obj, prop, value) => {
                try {
                    obj[ prop ] = value;
                    module.exports.parse(value)
                        .then((value) => {
                            value.action = 'set';
                            value.name = prop;
                            $lodash.forEach(sockets, (socket) => {
                                socket.emit(self.id, value);
                            });
                        });

                } catch (e) {
                    $logger.error(e);
                }
            }
        });

        socket.on(self.id, (data) => {
            self.dispatchEvents(data, originalScope, socket);
        });
        return scope;
    }

    dispatchEvents(data, scope, socket) {
        var self = this;
        if (!scope)
            return Q.reject(new Error('no scope'));
        if (data.action === 'start') {
            return Q.all($lodash.map(data.value, (value, name) => {
                if (!value || scope.hasOwnProperty(name))
                    return;

                return module.exports.format(value.value, value.type, name, socket, self.id)
                    .then(function (value) {
                        scope[ name ] = value;
                    });
            }));
        }
        else if (data.action === 'call') {
            return Q.all($lodash.map(data.arguments, (arg) => {
                return module.exports.format(arg.value, arg.type, arg.name, socket, self.id);
            }))
                .then((args) => {
                    // test
                    if (!scope[ data.name ])
                        return socket.emit(data.response, null);
                    //console.log('call', data.name, scope[ data.name ].toString());
                    var result = scope[ data.name ].apply(null, args);
                    Q(result).then(function (result) {
                        module.exports.parse(result)
                            .then(function (result) {
                                socket.emit(data.response, result);
                            });
                    })


                })
                .catch((error) => $logger.error(error));
        }
        else if (data.action === 'set') {
            return module.exports.format(data.value, data.type, data.name, socket, self.id)
                .then((value) => {
                    //console.log('set', data.name, value);
                    scope[ data.name ] = value;
                });
        }
        return Q.resolve();
    }

    loadGlobalModule(io) {
        var onDestroy, self = this;

        var originalScope = {};
        var sockets = [];
        var scope = new Proxy(originalScope, {
            get: (obj, prop) => {
                return obj[ prop ];
            },
            set: (obj, prop, value) => {
                try {
                    obj[ prop ] = value;
                    module.exports.parse(value)
                        .then((value) => {
                            value.action = 'set';
                            value.name = prop;
                            $lodash.forEach(sockets, (socket) => {
                                socket.emit(self.id, value);
                            });
                        });

                } catch (e) {
                    $logger.error(e);
                }
            }
        });

        io.on('connection', function (socket) {
            sockets.push(socket);
            socket.on(self.id, (data) => {
                self.dispatchEvents(data, originalScope, socket);
            });
            socket.on('disconnect', () => {
                $lodash.remove(sockets, socket);
            });
        });
        return scope;
    }

    loadModule(socket, onActive) {
        var onDestroy, self = this;

        var scope;
        var originalScope;

        socket.on(this.id, (data) => {
            if (data.action === 'start') {
                originalScope = {};
                originalScope.$on = (eventName, callback) => {

                };
                scope = new Proxy(originalScope, {
                        get: (obj, prop) => {
                            return obj[ prop ];
                        },
                        set: (obj, prop, value) => {
                            try {
                                obj[ prop ] = value;
                                module.exports.parse(value)
                                    .then((value) => {
                                        value.action = 'set';
                                        value.name = prop;
                                        socket.emit(self.id, value);
                                    })

                            } catch (e) {
                                $logger.error(e);
                            }
                        }
                    });
            }
            else if (data.action === 'end') {
                if (onDestroy)
                    onDestroy();
            }
            self.dispatchEvents(data, originalScope, socket)
                .then(() => {
                    if (data.action === 'start')
                        try {
                            onActive(scope, (destroy) => {
                                onDestroy = destroy;
                            });
                        } catch (e) {
                            $logger.error(e);
                        }
                });
        });
    }
}

function parseValue(value) {
    if (_.isFunction(value))
        return Q.resolve({
            type: 'function'
        });

    else if (typeof FileList === "function" && value instanceof FileList) {
        return Q.all(_.map(Array.from(value), function (file) {
            return file.arrayBuffer()
                .then(function (buffer) {
                    return {
                        type: 'File',
                        value: buffer,
                        name: file.name,
                        size: file.size,
                        mimeType: file.type
                    };
                });
        }))
            .then(function (children) {
                return {
                    type: 'FileList',
                    value: children
                };
            });
    }
    return Q.resolve({
        value: value,
        type: typeof value
    });
};
module.exports.parse = parseValue;

function formatValue(value, type, name, socket, namespace, oncePromiseFinished) {
    if (type === 'function')
        return Q.resolve(function () {
            var args = Array.from(arguments);
            return Q.all(_.map(args, function (arg) {
                return parseValue(arg);
            }))
                .then(function (args) {
                    responseId = `${ namespace }:${ name }:${ _.uniqueId() }`;
                    var deferred = Q.defer();
                    socket.once(responseId, function (data) {
                        formatValue(data.value, data.type, data.name, socket, namespace)
                            .then(function (result) {

                                if (_.isError(result))
                                    deferred.reject(result);
                                else
                                    deferred.resolve(result);
                            }, function (error) {
                                console.error(error);
                            });
                    });
                    socket.emit(namespace, {
                        action: 'call',
                        name: name,
                        response: responseId,
                        arguments: args
                    });

                    deferred.promise.finally(function () {
                        if (_.isFunction(oncePromiseFinished)) {
                            try {
                                oncePromiseFinished();
                            } catch (e) {
                                console.error(e);
                            }
                        }
                    });

                    return deferred.promise;
                });
        });
    else if (type === 'FileList') {
        return Q.all(_.map(value, function (file) {
            return formatValue(file.value, file.type, '', socket, namespace, oncePromiseFinished);
        }));
    }
    else if (type === 'File') {
        return Q.resolve(value);
    }

    return Q.resolve(value);
};
module.exports.format = formatValue;