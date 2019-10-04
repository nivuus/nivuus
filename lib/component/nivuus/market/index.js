/*
 * Copyright 2019 Allanic.me ISC License License
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 * Created by mallanic <maxime@allanic.me> at 30/09/2019
 */

const Octokit = require("@octokit/rest");
const $q = require('q-native');
const $lodash = require('lodash');
const Showdown = require('showdown');

module.exports = {
    translationPath: './translation',
    pages: {
        '/market': {
            title: '.TITLE',
            templateFile: './index.html',
            controller: function ($modules, $modal) {
                var market = this;

                var converter = new Showdown.Converter();
                const octokit = new Octokit({
                    auth: '1f1895318d30a003a195a5154dee1d34c8cf53de'
                });
                octokit.search.repos({
                    q: 'nivuus-module+in:name'
                })
                    .then((output) => {
                        return $q.all($lodash.map(output.data.items, (item) => {
                            item.title = $lodash.capitalize(item.name.replace(/^nivuus\-module\-/, ''));
                            item.installed = $modules.isInstalled(item.full_name);
                            return octokit.repos.getReadme({
                                owner: item.owner.login,
                                repo: item.name
                            })
                                .then((content) => {
                                    let buffer = new Buffer(content.data.content, 'base64');
                                    item.readme = converter.makeHtml(buffer.toString('ascii'));
                                })
                        }))
                            .then(() => {
                                market.repositories = output.data.items;
                            }, (error) => {
                                $logger.error(error);
                            });

                    }, (error) => {
                        $logger.error(error);
                    });

                market.remove = (repository) => {
                    $modules.uninstall(repository.full_name)
                        .then(() => {
                            repository.installed = false;
                        });
                };

                market.install = (repository) => {
                    $modules.install(repository.full_name);
                };

                market.show = (repository) => {
                    $modal.show({
                        templateUrl: 'repository.html',
                        bindToController: true,
                        data: {
                            repository
                        }
                    })
                        .then(() => {
                            console.log('ok');
                        }, (error) => {
                            console.error(error);
                        });
                };
            }
        }
    }
}