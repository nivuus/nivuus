/*
 * Copyright 2019 Allanic.me ISC License License
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 * Created by mallanic <maxime@allanic.me> at 08/09/2019
 */

const $glob = require('glob');
const $q = require('q-native');
const $lodash = require('lodash');

module.exports.services = {
    $translate: function ($modules) {
        var translations = {};

        $modules.forEach(function (module) {
            var translationPath = module.get('translationPath');

            if (translationPath) {
                $q.nfcall($glob, module.resolveFilePath(translationPath) + '/*')
                    .then((files) => {
                        $lodash.forEach(files, (file) => {
                            var matcher = file.match(/([a-zA-Z-]+)\.json$/);
                            var lang = matcher[ 1 ];
                            if (!translations[ lang ])
                                translations[ lang ] = {};

                            var namespace = $lodash.toUpper(module._id);
                            translations[ lang ][ namespace ] = require(file);
                        });
                    });
            }
        });

        this.get = function (name, lang) {
            if (!lang)
                return name;
            var matcher = lang.match(/([a-z]+)\-[A-Z]+/);

            return $lodash.get(translations[ matcher[1] ], name);
        }
    }
};

module.exports.directives = {
    ngTranslate: function ($translate, $browserManager) {
        return {
            restrict: 'A',
            link: function ($scope, $element, $attr) {
                function getNamespaceTranslation(base, scope) {
                    if (_.startsWith(base, '.')
                        && scope.hasOwnProperty('_translateNamespace'))
                        return getNamespaceTranslation(scope._translateNamespace + base, scope.$parent);
                    else if (_.startsWith(base, '.')
                            && !scope.hasOwnProperty('_translateNamespace')
                            && _.isObject(scope.$parent))
                        return getNamespaceTranslation(base, scope.$parent);
                    return base;
                };

                var translationPath = getNamespaceTranslation($attr.ngTranslate, $scope);
                $translate.get(translationPath, $browserManager.lang)
                    .then((translation) => {
                        $element.text(translation);
                    });
            }
        }
    }
};