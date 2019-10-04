/*
 * Copyright 2019 Allanic.me ISC License License
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 * Created by mallanic <maxime@allanic.me> at 04/09/2019
 */

const $lodash = require('lodash');
const translations = {};

module.exports.getAll = function () {
    return translations;
};

module.exports.addJson = function (lang, namespace, obj) {
    if (!translations[ lang ])
        translations[ lang ] = {};
    translations[lang][ namespace ] = obj;
};