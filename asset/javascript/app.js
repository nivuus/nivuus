/*
 * Copyright 2019 Allanic.me ISC License License
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 * Created by mallanic <maxime@allanic.me> at 07/08/2019
 */

// Connect socket
var socket = io.connect('/');

angular.module('default-app')
    .config(function($sceProvider) {
        $sceProvider.enabled(false);
    })
    .directive('ngConsole', function () {
        return {
            scope: {
                ngConsole: '='
            },
            link: function ($scope) {
                console.log($scope.ngConsole || $scope);
            }
        }
    })
    .directive('ngBindHtml', function () {
        return {
            scope: {
                ngBindHtml: '='
            },
            link: function ($scope, $element) {
                $element.html($scope.ngBindHtml);
            }
        };
    })
    .filter('humanize', function () {
        return function (value, type, precision) {
            if (type === 'bytesPerSecond') {
                value = parseFloat(value);
                if (isNaN(value) || !isFinite(value) || value <= 0)
                    return '-';
                var units = [ 'bytes/s', 'kB/s', 'MB/s', 'GB/s', 'TB/s', 'PB/s' ],
                    number = Math.floor(Math.log(value) / Math.log(1024));
                return (value / Math.pow(1024, Math.floor(number))).toFixed(2) + ' ' + units[ number ];
            }
            else if (type === 'bytes') {
                value = parseFloat(value);
                if (isNaN(value) || !isFinite(value) || value <= 0)
                    return '-';
                var units = [ 'bytes', 'kB', 'MB', 'GB', 'TB', 'PB' ],
                    number = Math.floor(Math.log(value) / Math.log(1024));
                return (value / Math.pow(1024, Math.floor(number))).toFixed(2) + ' ' + units[ number ];
            }
        };
    })
    .run(function ($rootScope, $window) {
        $rootScope.$window = $window;
        console.log($window);
    });