/*
 * Copyright 2019 Allanic.me ISC License License
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 * Created by mallanic <maxime@allanic.me> at 07/08/2019
 */

const Api = require('./lib');
const $logger = require('./lib/service/utils/logger');

// Load main
const $api = new Api(process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + 'Library/Preferences' : process.env.HOME + "/.local/share") + '/nivuus');

$api.load()
    .then(() => {
        $logger.info('loaded');
    }, (error) => {
        $logger.error(error);
    });
