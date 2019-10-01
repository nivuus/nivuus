/*
 * Copyright 2019 Allanic.me ISC License License
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 * Created by mallanic <maxime@allanic.me> at 01/10/2019
 */

const $lodash = require('lodash');
const $moment = require('moment');
const $chalk = require('chalk');

const types = [
    'debug',
    'info',
    'log',
    'warning',
    'error'
];

var oldConsole = console;

function defaultFormatter(type, color, prefix, ...args) {
    var date = $moment().format('DD-MM-YY HH:mm:ss'),
        output = '';
    if (!type)
        type = 'log';
    var typeDisplay = $lodash.padEnd(type, 7);
    prefix = `${ typeDisplay }${prefix ? prefix + ' ' : ''} ${ date }`;

    var space = $lodash.pad('', prefix.length + 1);
    prefix = $chalk`{${ color || 'reset' } ${prefix}}`

    $lodash.forEach(args, (arg) => {
        var line;
        if ($lodash.isError(arg))
            line = `${arg.stack}`;
        else if ($lodash.isObject(arg))
            line = JSON.stringify(arg, null, 4);
        else
            line = arg.toString();
        line = line.replace(/\n/g, '\n' + space);
        output += line;
    });

    oldConsole[type](`${prefix} ${output}`);
}

class Logger {
    constructor (minimum, formatter, prefix) {
        this._minimum = types.indexOf(minimum);
        this._formatter = formatter || defaultFormatter;
        this._prefix = prefix || '';
    }

    debug() {
        if (this._minimum <= 0) {
            this._formatter.bind(null, 'debug', 'grey', this._prefix).apply(null, arguments);
        }
    }

    info() {
        if (this._minimum <= 1) {
            this._formatter.bind(null, 'info', 'blue', this._prefix).apply(null, arguments);
        }
    }

    log() {
        if (this._minimum <= 2) {
            this._formatter.bind(null, null, 'green', this._prefix).apply(null, arguments);
        }
    }

    warning() {
        if (this._minimum <= 3) {
            this._formatter.bind(null, 'warning', 'yellow', this._prefix).apply(null, arguments);
        }
    }

    error() {
        if (this._minimum <= 4) {
            this._formatter.bind(null, 'error', 'red', this._prefix).apply(null, arguments);
        }
    }

    categorize(prefix, minimum) {
        return new Logger(minimum || this._minimum, this._formatter, prefix)
    }
}

module.exports = new Logger(process.env.NODE_ENV === 'dev' ? 'debug' : 'error');
console = module.exports;