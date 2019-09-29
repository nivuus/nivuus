/*
 * Copyright 2019 Allanic.me ISC License License
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 * Created by mallanic <maxime@allanic.me> at 07/08/2019
 */

const Api = require('./api');

// Load main
const $api = new Api(__dirname + '/data');

$api.load()
    .then(() => {
        console.log('loaded');
    }, console.error);
