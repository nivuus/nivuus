/*
 * Copyright 2019 Allanic.me ISC License License
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 * Created by mallanic <maxime@allanic.me> at 03/09/2019
 */

const $lodash = require('lodash');
const $q = require('q-native');
const _ = $lodash;

module.exports = class Communicator {
    constructor () {
        this.id = $lodash.uniqueId();
    }

    async getDeclaration(varBind, initialValues, defaultValues) {
        var self = this;
        var js = `
            socket.emit('${this.id}', {
                action: 'start',
                value: ${initialValues}
            });
            ${varBind}.$on('$destroy', function () {
                socket.emit('${this.id}', {
                    action: 'end'
                });
            });

            socket.on('connect', function () {
                Promise.all(_.map(${varBind}, function (value, name) {
                    if (name[0] != '$'
                        && previousValue[name] !== ${varBind}[name]) {
                        return parseValue(value);

                    }
                }))
                    .then(function (args) {
                        socket.emit('${this.id}', {
                            action: 'start',
                            value: args
                        });
                    });

            })

            socket.on('${this.id}', function (data) {
                if (data.action === 'set') {
                    formatValue(data.value, data.type, data.name, socket, '${this.id}')
                        .then(function (value) {
                            ${varBind}[data.name] = value;
                            previousValue[data.name] = value;
                            ${varBind}.$apply();
                        });
                }
            });

            var previousValue = {};

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
            await $q.all($lodash.map(defaultValues, async (value, key) => {
                if (typeof value === 'function') {

                    value = await module.exports.parse(value);

                    js += `
                        (function () {
                            var data = ${JSON.stringify(value)};

                            var p = formatValue(data.value, data.type, '${ key }', socket, '${this.id}')
                                .then(function (value) {
                                    ${ varBind }['${ key }'] = value;
                                    return Promise.resolve(value);
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
                    console.error(e);
                }
            }
        });

        socket.on(self.id, (data) => {
            if (data.action === 'start') {
                Promise.all($lodash.map(data.value, (value, name) => {
                    if (!value)
                        return;
                    return module.exports.format(value, typeof value, name, socket, self.id)
                        .then(function (value) {
                            originalScope[ name ] = value;
                        });
                }));
            }
            if (data.action === 'call') {

                Promise.all($lodash.map(data.arguments, (arg) => {
                    return module.exports.format(arg.value, arg.type, arg.name, socket, self.id);
                }))
                    .then((args) => {
                        var result = scope[ data.name ].apply(null, args);
                        module.exports.parse(result)
                            .then(function (result) {
                                socket.emit(data.response, result);
                            });
                    });
            }
            else if (data.action === 'set') {
                module.exports.format(data.value, data.type, data.name, socket, self.id)
                    .then((value) => {
                        originalScope[ data.name ] = value;
                    });
            }
        });
        return scope;
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
                    console.error(e);
                }
            }
        });

        io.on('connection', function (socket) {
            sockets.push(socket);
            socket.on(self.id, (data) => {
                if (data.action === 'call') {

                    Promise.all($lodash.map(data.arguments, (arg) => {
                        return module.exports.format(arg.value, arg.type, arg.name, socket, self.id);
                    }))
                        .then((args) => {
                            var result = scope[ data.name ].apply(null, args);
                            module.exports.parse(result)
                                .then(function (result) {
                                    socket.emit(data.response, result);
                                });
                        });
                }
                else if (data.action === 'set') {
                    module.exports.format(data.value, data.type, data.name, socket, self.id)
                        .then((value) => {
                            originalScope[ data.name ] = value;
                        });
                }
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
                originalScope = data.value;
                if (!originalScope)
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
                                console.error(e);
                            }
                        }
                    });
                try {
                    onActive(scope, (destroy) => {
                        onDestroy = destroy;
                    });
                } catch (e) {
                    console.error(e);
                }
            }
            else if (!scope)
                return;
            else if (data.action === 'end') {
                if (onDestroy)
                    onDestroy();
            }
            else if (data.action === 'call') {
                Promise.all($lodash.map(data.arguments, (arg) => {
                    return module.exports.format(arg.value, arg.type, arg.name, socket, self.id);
                }))
                    .then((args) => {
                        // test
                        if (!scope[ data.name ])
                            return socket.emit(data.response, null);
                        var result = scope[ data.name ].apply(null, args);
                        module.exports.parse(result)
                            .then(function (result) {
                                socket.emit(data.response, result);
                            })

                    });
            }
            else if (data.action === 'set') {
                module.exports.format(data.value, data.type, data.name, socket, self.id)
                    .then((value) => {
                        originalScope[ data.name ] = value;
                    });
            }

        });
    }
}

module.exports.parse = function parseValue(value) {
    if (_.isFunction(value))
        return Promise.resolve({
            type: 'function'
        });

    else if (typeof FileList === "function" && value instanceof FileList) {
        return Promise.all(_.map(Array.from(value), function (file) {
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
    return Promise.resolve({
        value: value,
        type: typeof value
    });
};

module.exports.format = function formatValue(value, type, name, socket, namespace) {
    if (type === 'function')
        return Promise.resolve(function () {
            var args = Array.from(arguments);
            return Promise.all(_.map(args, function (arg) {
                return parseValue(arg);
            }))
                .then(function (args) {
                    responseId = `${ namespace }:${ name }:${ _.uniqueId() }`;
                    return new Promise((resolve, reject) => {
                        socket.once(responseId, function (data) {
                            formatValue(data.value, data.type, data.name, socket, namespace)
                                .then(function (result) {
                                    if (_.isError(result))
                                        reject(result);
                                    else
                                        resolve(result);
                                });
                        });
                        socket.emit(namespace, {
                            action: 'call',
                            name: name,
                            response: responseId,
                            arguments: args
                        });
                    })

                });

        });
    else if (type === 'FileList') {
        return Promise.all(_.map(value, function (file) {
            return formatValue(file.value, file.type, '', socket, namespace);
        }));
    }
    else if (type === 'File') {
        return Promise.resolve(value);
    }

    return Promise.resolve(value);
};