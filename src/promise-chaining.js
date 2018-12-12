/* global define */
/**
 * @license
 * promise-chaining 0.1.0 Copyright (c) 2017 Kazuyuki Namba
 * Available via the MIT license.
 * see: https://github.com/kulikala/promise-chaining for details
 */
;((function (root, factory) {
  'use strict'

  var NAME = 'Chain'
  var hasGlobal = !!(typeof global === 'object' && global === global.global)
  var isCommonJS = !!(typeof exports === 'object' && typeof module === 'object')
  var isRequireJS = !!(typeof define === 'function' && define.amd)

  // Detect variable `global` and use it as `root`
  if (hasGlobal) {
    root = global
  }

  if (isCommonJS) {
    // CommonJS
    module.exports = factory()
  } else if (isRequireJS) {
    // RequireJS
    define(NAME, factory)
  } else {
    // <script>
    root[NAME] = factory()
  }
})(this, function () {
  'use strict'

  // Status
  var STATUS = {
    PENDING: 'pending',
    FULFILLED: 'fulfilled',
    REJECTED: 'rejected',
    CANCELED: 'canceled'
  }

  // Shorthand for utility methods
  function slice (args) {
    return [].slice.call(args)
  }

  function isFunction (value) {
    return typeof value === 'function'
  }

  function isArray (value) {
    return value instanceof Array
  }

  function isObject (value) {
    return value && typeof value === 'object'
  }

  function isUndefined (value) {
    return typeof value === 'undefined'
  }

  // Constructor of Class Chain
  function Chain () {
    var _list = slice(arguments)
    var _status = STATUS.PENDING
    var _reason

    var _onRejected = function (error, doThrow) {
      if (doThrow) {
        if (isFunction(Chain.onError)) {
          // Avoid throwing error globaly if Chain.onError function is set
          Chain.onError(error)
        } else {
          // Throw catched error unless this callback is overriden
          throw error
        }
      } else {
        // Throw catched error on the next tick
        setTimeout(function () {
          _onRejected(error, true)
        }, 0)
      }
    }

    function _checkStatus () {
      if (_status !== STATUS.PENDING) {
        return false
      }

      if (!_list.length) {
        _status = STATUS.FULFILLED

        return false
      }

      return true
    }

    function _process () {
      var args = slice(arguments)
      var item
      var ret
      var context
      var params = []

      if (!_checkStatus()) {
        return
      }

      item = _list.shift()

      if (isArray(item) && item.length && isFunction(item[0])) {
        context = item[1]
        params = item.slice(2)
        item = item[0]
      }

      params = params.concat(args)

      if (isFunction(item)) {
        try {
          ret = item.apply(context, params)
          params = []
        } catch (error) {
          _status = STATUS.REJECTED
          _reason = error
          _onRejected(_reason)
        }
      } else {
        ret = item
      }

      if (isObject(ret) && isFunction(ret.then)) {
        ret.then(_process)
      } else {
        params.push(ret)
        _process.apply(null, params)
      }
    }

    // Method to add more chain
    this.then = function (onFulfilled, onRejected) {
      if (isFunction(onRejected)) {
        _onRejected = onRejected
      }

      if (_status === STATUS.REJECTED && isFunction(_onRejected)) {
        _onRejected(_reason)
      } else if (_status === STATUS.FULFILLED && isFunction(onFulfilled)) {
        onFulfilled()
      } else if (!isUndefined(onFulfilled)) {
        _list.push(onFulfilled)
      }

      return this
    }

    // Method to add onRejected callback
    this.catch = function (onRejected) {
      if (isFunction(onRejected)) {
        _onRejected = onRejected
      }

      if (_status === STATUS.REJECTED && isFunction(_onRejected)) {
        _onRejected(_reason)
      }

      return this
    }

    // Method to bulk add chains
    this.add = function (items) {
      if (isArray(items)) {
        _list = _list.concat(items)

        if (_status === STATUS.FULFILLED) {
          _status = STATUS.PENDING

          this.process()
        }
      }

      return this
    }

    // Method to start processing chains
    this.process = function () {
      _process.apply(this, arguments)

      return this
    }

    // Method to cancel iterating chain
    this.cancel = function () {
      _status = STATUS.CANCELED

      return this
    }

    // Property to get status
    Object.defineProperty(this, 'status', {
      configurable: false,
      enumerable: true,
      get: function () {
        return _status
      }
    })

    // Property to get canceled status
    Object.defineProperty(this, 'isCanceled', {
      configurable: false,
      enumerable: true,
      get: function () {
        return _status === STATUS.CANCELED
      }
    })

    // Start process now
    if (_list.length) {
      _process()
    }
  }

  return Chain
}))
