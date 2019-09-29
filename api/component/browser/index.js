/*
 * Copyright 2019 Allanic.me ISC License License
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 * Created by mallanic <maxime@allanic.me> at 09/09/2019
 */

module.exports = {
    sessionServices: {
        '$browserManager': function () {
            this.lang = navigator.language;
        }
    }
}