/*
 * Copyright 2019 Allanic.me ISC License License
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 * Created by mallanic <maxime@allanic.me> at 18/08/2019
 */

const $getFunctionArguments = require('get-function-arguments');
const $lodash = require('lodash');

module.exports = class {
    constructor () {
        this._invokedServices = {};
        this._notInvokedServices = {};
    }

    add(name, caller) {
        this._notInvokedServices[ name ] = caller;
    }

    invoke(caller, additionalServices, thisInvoke) {
        if (!additionalServices)
            additionalServices = {};
        var definedArgs = $getFunctionArguments(caller);
        var args = [];
        var self = this;
        $lodash.forEach(definedArgs, (definedArg) => {
            if (additionalServices[ definedArg ])
                args.push(additionalServices[ definedArg ]);
            else
                args.push(self.get(definedArg));
        });
        return caller.apply(thisInvoke || null, args);
    }

    get(name) {
        if (!this._notInvokedServices[ name ])
            throw new Error(`there is no service called ${ name }`);
        else if (!this._invokedServices[ name ])
            this._invokedServices[ name ] = this.invoke(this._notInvokedServices[ name ]);
        return this._invokedServices[ name ];
    }
}