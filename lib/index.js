
const $q = require('q');
const $express = require('express');
const $lodash = require('lodash');

const ModuleManager = require('./module-manager');

module.exports = class {
    constructor (path) {
        this.path = path;
        this.modules = new ModuleManager(path + '/module');
    }

    load() {
        var self = this;

        // Create Express, Socket.io instances
        this.app = new $express();
        var http = require('http').createServer(this.app);
        this.modules._injector.add('$httpServer', () => {
            return http;
        });
        this.io = require('socket.io')(http);

        // Load all modules
        return this.modules.load()
            .then(() => {
                return self.modules.loadSystemPackages();
            })
            .then(() => {
                return self.modules.loadSystemServices();
            })
            .then(() => {
                return self.modules.getJavascriptDeclaration(self.io);
            })
            .then((moduleFiles) => {
                self.app.get("/javascript/modules.js", (request, resource) => {
                    resource.type('application/javascript');
                    resource.send(moduleFiles);
                });
            })
            .then(() => {
                return self.modules.getCssDeclaration();
            })
            .then((cssContent) => {
                self.app.get("/stylesheet/modules.css", (request, resource) => {
                    resource.type('text/css');
                    resource.send(cssContent);
                });
            })
            .then(() => {
                $lodash.forEach(self.modules.getStatics(), (staticFile) => {
                    self.app.use('/' + staticFile.http, $express.static('.' + staticFile.path));
                });
            })
            .then(() => {
                // Configure static files
                self.app.use($express.static(__dirname + '/../asset'));
                self.app.use('/node_modules/', $express.static(__dirname + '/../node_modules'));
                self.app.use(function(request, resource) {
                    resource.sendFile("index.html", { root: __dirname + '/../asset/' });
                });
                var deferred = $q.defer();
                http.listen(80, () => {
                    deferred.resolve();
                });
                return deferred.promise;
            })
    }
};