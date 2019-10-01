/*
 * Copyright 2019 Allanic.me ISC License License
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 * Created by mallanic <maxime@allanic.me> at 09/09/2019
 */

module.exports = {
    statics: {
        'uib/template/': '/node_modules/ui-bootstrap4/template'
    },
    sessionServices: {
        '$browserManager': function () {
            this.lang = navigator.language;
            this.location = window.location;
        },
        '$modal': function ($uibModal) {
            this.show = (options) => {
                options.appendTo = angular.element('ui-view');
                options.controller = function ($scope) {
                    _.forEach(options.data, function (value, key) {
                        $scope[ key ] = value;
                    });
                }
                return $uibModal.open(options);
            };
        }
    }
}