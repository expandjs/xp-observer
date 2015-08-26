/*jslint browser: true, devel: true, node: true, ass: true, nomen: true, unparam: true, indent: 4 */

/**
 * @license
 * Copyright (c) 2015 The ExpandJS authors. All rights reserved.
 * This code may only be used under the BSD style license found at https://expandjs.github.io/LICENSE.txt
 * The complete set of authors may be found at https://expandjs.github.io/AUTHORS.txt
 * The complete set of contributors may be found at https://expandjs.github.io/CONTRIBUTORS.txt
 */
(function (global) {
    "use strict";

    // Vars
    var XP       = global.XP || require('expandjs'),
        Observer = require('observe-js').ObjectObserver;

    /*********************************************************************/

    /**
     * This class is used to provide object observing functionality.
     *
     * @class XPObserver
     * @description This class is used to provide object observing functionality
     */
    module.exports = new XP.Class('XPObserver', {

        /**
         * @constructs
         * @param {Array | Function | Object} value
         * @param {Function} callback
         * @param {boolean} [deep = false]
         */
        initialize: function (value, callback, deep) {

            // Asserting
            XP.assertArgument(XP.isObservable(value), 1, 'Array, Function or Object');
            XP.assertArgument(XP.isFunction(callback), 2, 'Function');

            // Vars
            var self = this;

            // Setting
            self.value      = value;
            self.callback   = callback;
            self.deep       = deep;
            self._observers = [];

            // Observing
            self._addObserver(self.value);

            return self;
        },

        /*********************************************************************/

        /**
         * Disconnects the observer
         *
         * @method disconnect
         * @returns {Object}
         */
        disconnect: function () {
            return this._disconnectObserver(this._observer) ? this : undefined;
        },

        /*********************************************************************/

        /**
         * Adds the observer for value
         *
         * @method _addObserver
         * @param {Array | Function | Object} value
         * @param {Array | Function | Object} [wrapper]
         * @returns {Object}
         * @private
         */
        _addObserver: {
            enumerable: false,
            value: function (value, wrapper) {

                // Asserting
                XP.assertArgument(XP.isObservable(value), 1, 'Array, Function or Object');
                XP.assertArgument(XP.isVoid(wrapper) || XP.isObservable(wrapper), 2, 'Array, Function or Object');

                // Vars
                var self = this;

                // Checking
                if ((XP.isObservable(value) && self._isObserved(value)) || (wrapper && !XP.includes(wrapper, value))) { return self; }

                // Adding
                if (value === self.value) { self._observer = self._connectObserver(new Observer(value)); }
                if (value !== self.value) { self._observers.push(self._connectObserver(new Observer(value))); }
                if (self.deep) { XP.forEach(value, function (sub) { if (XP.isObservable(sub)) { self._addObserver(sub, value); } }); }

                return self;
            }
        },

        /**
         * Connects an observer
         *
         * @method _connectObserver
         * @param {Object} observer
         * @returns {Object}
         * @private
         */
        _connectObserver: {
            enumerable: false,
            value: function (observer) {

                // Asserting
                XP.assertArgument(XP.isObject(observer), 1, 'Object');

                // Vars
                var self     = this,
                    value    = self._getObserved(observer),
                    callback = function (added, removed, changed, getOld) {

                        // Updating
                        XP.forEach(added, function (sub) { if (XP.isObservable(sub)) { self._addObserver(sub, value); } });
                        XP.forEach(changed, function (sub, key) { if (XP.isObservable(sub)) { self._addObserver(sub, value)._removeObserver(getOld(key)); } });
                        XP.forEach(removed, function (sub, key) { if (XP.isObservable(getOld(key))) { self._removeObserver(getOld(key)); } });

                        return self.callback(self.value);
                    };

                // Connecting
                if (value) { observer.open(callback); } else { return observer; }
                if (observer === self._observer) { self._observers.forEach(function (observer) { observer.open(callback); }); }

                return observer;
            }
        },

        /**
         * Disconnects an observer
         *
         * @method _disconnectObserver
         * @param {Object} observer
         * @returns {Object}
         * @private
         */
        _disconnectObserver: {
            enumerable: false,
            value: function (observer) {

                // Asserting
                XP.assertArgument(XP.isObject(observer), 1, 'Object');

                // Vars
                var self = this;

                // Disconnecting
                if (XP.isInstance(observer, Observer)) { observer.close(); } else { return observer; }
                if (observer === self._observer) { self._observers.forEach(function (observer) { observer.close(); }); }

                return observer;
            }
        },

        /**
         * Returns the value of observer
         *
         * @method _getObserved
         * @param {Object} observer
         * @returns {Array | Object}
         * @private
         */
        _getObserved: {
            enumerable: false,
            value: function (observer) {
                XP.assertArgument(XP.isObject(observer), 1, 'Object');
                return observer.value_;
            }
        },

        /**
         * Returns the observer of value
         *
         * @method _getObserver
         * @param {Array | Function | Object} value
         * @returns {Object | undefined}
         * @private
         */
        _getObserver: {
            enumerable: false,
            value: function (value) {
                XP.assertArgument(XP.isObservable(value), 1, 'Array, Function or Object');
                return XP.find(this._observers, {value_: value});
            }
        },

        /**
         * Returns true if value is observed
         *
         * @method _isObserved
         * @param {Array | Function | Object} value
         * @returns {boolean}
         * @private
         */
        _isObserved: {
            enumerable: false,
            value: function (value) {
                XP.assertArgument(XP.isObservable(value), 1, 'Array, Function or Object');
                return value === this.value ? !!this._observer : !!this._getObserver(value);
            }
        },

        /**
         * Removes the observer of value
         *
         * @method _removeObserver
         * @param {Array | Function | Object} value
         * @returns {Object}
         * @private
         */
        _removeObserver: {
            enumerable: false,
            value: function (value) {

                // Asserting
                XP.assertArgument(XP.isObservable(value), 1, 'Array, Function or Object');

                // Vars
                var self     = this,
                    observer = self._getObserver(value);

                // Checking
                if (!observer || XP.includesDeep(self.value, value)) { return self; }

                // Removing
                XP.pull(self._observers, self._disconnectObserver(observer));
                XP.forEach(self.deep ? value : {}, function (sub) { if (XP.isObservable(sub)) { self._removeObserver(sub); } });

                return self;
            }
        },

        /*********************************************************************/

        /**
         * TODO DOC
         *
         * @property callback
         * @type Function
         */
        callback: {
            set: function (val) { return XP.isFunction(val) ? function () { return val(); } : null; },
            validate: function (val) { return XP.isFunction(val); }
        },

        /**
         * TODO DOC
         *
         * @property deep
         * @type boolean
         */
        deep: {
            set: function (val) { return !!val; }
        },

        /**
         * TODO DOC
         *
         * @property value
         * @type Array | Function | Object
         */
        value: {
            set: function (val) { return this.value || val; },
            validate: function (val) { return XP.isObservable(val); }
        },

        /*********************************************************************/

        /**
         * TODO DOC
         *
         * @property _observer
         * @type Object
         * @private
         */
        _observer: {
            enumerable: false,
            set: function (val) { return this._observer || val; },
            validate: function (val) { return XP.isObject(val); }
        },

        /**
         * TODO DOC
         *
         * @property _observers
         * @type Array
         * @private
         */
        _observers: {
            enumerable: false,
            set: function (val) { return this._observers || val; },
            validate: function (val) { return XP.isArray(val); }
        }
    });

}(typeof window !== "undefined" ? window : global));