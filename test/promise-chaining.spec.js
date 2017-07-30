/* eslint-env mocha */
/* global define */
;((function (root, factory) {
  'use strict'

  var hasGlobal = !!(typeof global === 'object' && global === global.global)
  var isCommonJS = !!(typeof exports === 'object' && typeof module === 'object')
  var isRequireJS = !!(typeof define === 'function' && define.amd)

  // Detect variable `global` and use it as `root`
  if (hasGlobal) {
    root = global
  }

  if (isCommonJS) {
    // CommonJS
    module.exports = factory(root, require('chai'), require('../src/promise-chaining'))
  } else if (isRequireJS) {
    // RequireJS
    define(['chai', 'Chain'], factory.bind(null, root))
  } else {
    // <script>
    factory(root, root.chai, root.Chain)
  }
})(this, function (root, chai, Chain) {
  'use strict'

  var describe = root.describe
  var it = root.it
  var expect = chai.expect

  if (typeof root.Promise !== 'function') {
    /*
     * Simple simulation of native Promise
     * Lacks `reject` parameter of executor and catch() handler
     */
    root.Promise = function (executor) {
      var _fulfilled
      var _result

      function resolve(result) {
        if (typeof _fulfilled === 'function') {
          _fulfilled(result)
        } else {
          _fulfilled = true
        }

        _result = result
      }

      this.then = function (onFulfilled) {
        if (_fulfilled === true) {
          onFulfilled(_result)
        }

        _fulfilled = onFulfilled

        return this
      }

      executor(resolve)
    }
  }

  // Shorthand for utility methods
  function slice(args) {
    return [].slice.call(args)
  }

  function genSecs() {
    return Math.floor(50 + Math.random() * 100)
  }

  function throwsErrorFunc() {
    throw new Error('throwsErrorFunc() is called')
  }

  function waitFor() {
    var args = slice(arguments)
    var promise = new root.Promise(function (resolve) {
      setTimeout(function () {
        promise.status = 'fulfilled'

        resolve.apply(null, args.length ? [args] : [])
      }, genSecs())
    })

    promise.status = 'pending'

    return promise
  }

  describe('Chain', function () {
    describe('Example', function (done) {
      // Example definition
      var SOME_CONDITION = true
      var OTHER_CONDITION = true

      function promiseGenerator(n, arg) {
        // Creates and returns promise object
        return new root.Promise(function (resolve) {
          console.log('Task ' + n + ': start')

          // Do an asynchronous task here...
          doAsyncTask(function () {
            console.log('Task ' + n + ': done')

            resolve(arg)
          })
        })
      }

      function thenableGenerator(n, arg) {
        // Creates and returns thenable object
        var resolve

        console.log('Task ' + n + ': start')

        // Do another asynchronous task here...
        doAsyncTask(function () {
          console.log('Task ' + n + ': done')

          resolve(arg)
        })

        return {
          then: function (callback) {
            resolve = callback
          }
        }
      }

      function doAsyncTask(callback) {
        setTimeout(callback, 100)
      }

      it('Using `Chain`', function (done) {
        var chain = new Chain(promiseGenerator(1))
        // -> Task 1: start

        if (SOME_CONDITION /* true, for example */) {
          chain.then([promiseGenerator, null, 2])
        }

        chain.then(function () {
          return new root.Promise(function (resolve) {
            console.log('Task 3: start')

            doAsyncTask(function () {
              console.log('Task 3: done')

              resolve(promiseGenerator(4))
            })
          })
        })

        if (OTHER_CONDITION /* true, for example */) {
          chain.then([thenableGenerator, null, 5])
        }

        chain.then(function () {
          console.log('All done')
          done()
        })
        // -> Task 1: done
        // -> Task 2: start
        // -> Task 2: done
        // -> Task 3: start
        // -> Task 3: done
        // -> Task 4: start
        // -> Task 4: done
        // -> Task 5: start
        // -> Task 5: done
        // -> All done
      })

      it('Equivalent code using ES2015 `Promise`', function (done) {
        var chain = promiseGenerator(1)
        // -> Task 1: start

        if (SOME_CONDITION /* true, for example */) {
          chain = chain.then(promiseGenerator.bind(null, 2))
        }

        chain = chain.then(function () {
          return new root.Promise(function (resolve) {
            console.log('Task 3: start')

            doAsyncTask(function () {
              console.log('Task 3: done')

              resolve(promiseGenerator(4))
            })
          })
        })

        if (OTHER_CONDITION /* true, for example */) {
          chain = chain.then(thenableGenerator.bind(null, 5))
        }

        chain.then(function () {
          console.log('All done')
          done()
        })
        // -> Task 1: done
        // -> Task 2: start
        // -> Task 2: done
        // -> Task 3: start
        // -> Task 3: done
        // -> Task 4: start
        // -> Task 4: done
        // -> Task 5: start
        // -> Task 5: done
        // -> All done
      })
    })

    describe('constructor', function () {
      it('should be a constructor', function () {
        var chain = new Chain()

        expect(chain).to.be.an('object')
        expect(chain.constructor).to.be.a('function')
      })

      it('should initialize status to be "pending"', function () {
        var chain = new Chain()

        expect(chain.status).to.equal('pending')
      })

      it('should accept multiple static values and fulfill immediately', function () {
        var chain = new Chain(null, undefined, 0, [], {}, false)

        expect(chain.status).to.equal('fulfilled')
      })

      it('should accept Promises and wait for them to be resolved', function () {
        var chain = new Chain(waitFor(), waitFor(), waitFor())

        expect(chain.status).to.equal('pending')
      })

      it('should throw an error if no catch() call is chained', function (done) {
        var captured

        Chain.onError = function (error) {
          captured = error
        }

        var chain = new Chain(throwsErrorFunc)

        setTimeout(function () {
          expect(chain.status).to.equal('rejected')
          expect(captured).to.be.an('error')
          expect(captured.message).to.equal('throwsErrorFunc() is called')

          Chain.onError = undefined

          done()
        }, 10)
      })
    })

    describe('#then()', function () {
      it('should accept 2 callbacks and save them to be processed', function () {
        var chain = new Chain()

        chain.then(throwsErrorFunc, throwsErrorFunc)

        expect(chain.status).to.equal('pending')
      })

      it('should call 1st callback immediately if status is "fulfilled"', function () {
        var chain = new Chain(1, 2, 3)
        var flag = false

        chain.then(function (value) {
          flag = true
        })

        expect(flag).to.equal(true)
      })

      it('should accept static values and wait for process() to be called', function () {
        var chain = new Chain()

        chain.then(1, 2, 3)

        expect(chain.status).to.equal('pending')
      })

      it('should accept a Promise and wait for process() to be called', function () {
        var chain = new Chain()
        var promise = waitFor()

        chain.then(promise)

        expect(chain.status).to.equal('pending')
        expect(promise.status).to.equal('pending')
      })

      it('should accept an array and wait for process() to be called', function () {
        var chain = new Chain()
        var args = [
          throwsErrorFunc,
          'arg1',
          'arg2'
        ]

        chain.then(args)

        expect(chain.status).to.equal('pending')
      })

      it('should call 2nd callback immediately if status is "rejected"', function () {
        var chain = new Chain(throwsErrorFunc)
        var flag = false

        chain.then(throwsErrorFunc, function (error) {
          expect(error.message).to.equal('throwsErrorFunc() is called')
          flag = true
        })

        expect(chain.status).to.equal('rejected')
        expect(flag).to.equal(true)
      })

      it('should return its instance for chaining', function () {
        var chain = new Chain()

        expect(chain.then()).to.equal(chain)
      })
    })

    describe('#catch()', function () {
      it('should accept a callback and save it to be called', function () {
        var chain = new Chain()
        var flag = false

        chain.catch(function (error) {
          expect(error.message).to.equal('throwsErrorFunc() is called')
          flag = true
        })

        expect(chain.status).to.equal('pending')

        chain.then(throwsErrorFunc)

        expect(chain.status).to.equal('pending')

        chain.process()

        expect(chain.status).to.equal('rejected')
        expect(flag).to.equal(true)
      })

      it('should call the callback immediately if status is "rejected"', function () {
        var chain = new Chain(throwsErrorFunc)
        var flag = false

        chain.catch(function (error) {
          expect(error.message).to.equal('throwsErrorFunc() is called')
          flag = true
        })

        expect(chain.status).to.equal('rejected')
        expect(flag).to.equal(true)
      })

      it('should return its instance for chaining', function () {
        var chain = new Chain()

        expect(chain.catch()).to.equal(chain)
      })
    })

    describe('#add()', function () {
      it('should ignore parameters if it is not an array', function () {
        var chain = new Chain(1)

        chain.add(throwsErrorFunc, throwsErrorFunc)
        chain.add(1, 2)
        chain.add({}, {}, {})

        expect(chain.status).to.equal('fulfilled')
      })

      it('should accept an array of callbacks and process them immediately', function () {
        var chain = new Chain(1)
        var flag = false

        chain.add([
          2,
          3,
          function () {
            expect(slice(arguments)).to.deep.equal([2, 3])
            flag = true
          }
        ])

        expect(chain.status).to.equal('fulfilled')
        expect(flag).to.equal(true)
      })

      it('should accept an array of callbacks and chain them', function (done) {
        var chain = new Chain(1, 2, waitFor)
        var flag = false

        chain.add([
          3,
          waitFor,
          4,
          function () {
            expect(slice(arguments)).to.deep.equal([[[1, 2], 3], 4])
            flag = true
            done()
          }
        ])

        expect(chain.status).to.equal('pending')
        expect(flag).to.equal(false)
      })

      it('should return its instance for chaining', function () {
        var chain = new Chain()

        expect(chain.add()).to.equal(chain)
      })
    })

    describe('#process()', function () {
      it('should start calling stacked callback functions', function () {
        var chain = new Chain()
                          .then(function () {
                            return 1
                          })
                          .then(function (value) {
                            return [value, 2]
                          })
                          .then(function (value) {
                            expect(value).to.deep.equal([1, 2])
                            flag = true
                          })
        var flag = false

        expect(chain.status).to.equal('pending')

        chain.process()

        expect(flag).to.equal(true)
      })

      it('should do nothing if status is "fulfilled"', function () {
        var flag = false
        var chain = new Chain(
          function () {
            return 1
          },
          function (value) {
            return [value, 2]
          },
          function (value) {
            expect(value).to.deep.equal([1, 2])
            flag = true
          }
        )

        expect(chain.status).to.equal('fulfilled')
        expect(flag).to.equal(true)

        chain.process()

        expect(chain.status).to.equal('fulfilled')
      })

      it('should return its instance for chaining', function () {
        var chain = new Chain()

        expect(chain.process()).to.equal(chain)
      })
    })

    describe('#cancel()', function () {
      it('should change status to "canceled"', function () {
        var chain = new Chain()

        expect(chain.status).to.equal('pending')

        chain.cancel()

        expect(chain.status).to.equal('canceled')
      })

      it('should stop processing chains after cancel()', function () {
        var chain = new Chain(1)

        expect(chain.status).to.equal('fulfilled')

        chain.cancel()

        expect(chain.status).to.equal('canceled')

        chain.add([
          throwsErrorFunc
        ])

        expect(chain.status).to.equal('canceled')
      })

      it('should stop processing chains after cancel() 2', function () {
        var chain = new Chain(waitFor, throwsErrorFunc)

        expect(chain.status).to.equal('pending')

        chain.cancel()

        expect(chain.status).to.equal('canceled')
      })

      it('should return its instance for chaining', function () {
        var chain = new Chain()

        expect(chain.cancel()).to.equal(chain)
      })
    })

    describe('#status', function () {
      it('should be "pending" when a instance is initialized', function () {
        var chain = new Chain()

        expect(chain.status).to.equal('pending')
      })

      it('should be "fulfilled" when all chain has been processed', function (done) {
        var chain = new Chain(waitFor)

        expect(chain.status).to.equal('pending')

        chain
          .then(1)
          .then(waitFor)
          .then(waitFor)

        expect(chain.status).to.equal('pending')

        chain.add([
          2,
          3,
          waitFor
        ])

        expect(chain.status).to.equal('pending')

        chain.then(function (value) {
          expect(value).to.deep.equal([[[undefined, 1]], 2, 3])

          setTimeout(function () {
            expect(chain.status).to.equal('fulfilled')
            done()
          }, 0)
        })

        expect(chain.status).to.equal('pending')
      })

      it('should be "rejected" after one of callback raised error', function () {
        var chain = new Chain(throwsErrorFunc)
        var flag = false

        chain.then(function () {
          expect().fail('called', 'should not called')
        }, function (error) {
          expect(error.message).to.equal('throwsErrorFunc() is called')
          flag = true
        })

        expect(chain.status).to.equal('rejected')
        expect(flag).to.equal(true)
      })

      it('should be "canceled" after cancel() is called', function () {
        var chain = new Chain(waitFor, throwsErrorFunc)

        expect(chain.status).to.equal('pending')

        chain.cancel()

        expect(chain.status).to.equal('canceled')
      })

      it('should be "pending" after add() is called although the status was "fulfilled"', function (done) {
        var chain = new Chain(1)

        expect(chain.status).to.equal('fulfilled')

        chain.add([
          waitFor,
          function (value) {
            expect(value).to.be.an('undefined')

            setTimeout(function () {
              expect(chain.status).to.equal('fulfilled')
              done()
            }, 0)
          }
        ])

        expect(chain.status).to.equal('pending')
      })
    })

    describe('#isCanceled', function () {
      it('should be false when a instance is initialized', function () {
        var chain = new Chain()

        expect(chain.isCanceled).to.equal(false)
      })

      it('shoud be true after cancel() is called', function () {
        var chain = new Chain()

        expect(chain.isCanceled).to.equal(false)

        chain.cancel()

        expect(chain.isCanceled).to.equal(true)
      })
    })

    describe('then() argument', function () {
      it('can be static values, functions, or thenable objects', function (done) {
        var chain = new Chain()
                          // Number
                          .then(1)

                          // Boolean
                          .then(true)

                          // Array
                          .then([])

                          // Object
                          .then({})

                          // Function
                          .then(function () {
                            expect(slice(arguments)).to.deep.equal([1, true, [], {}])
                          })

                          // Promise
                          .then(waitFor())

                          // Another Chain object
                          .then(new Chain(waitFor, waitFor, waitFor))

                          // Thenable object
                          .then({
                            then: function (next) {
                              next('thenable')
                            }
                          })

                          // Wrap-up
                          .then(function (value) {
                            expect(value).to.equal('thenable')
                            done()
                          })

        chain.process()
      })

      it('can be function returns thenable object', function (done) {
        var chain = new Chain()
                          // Returns Promise object
                          .then(waitFor)

                          // Or this way
                          .then(function () {
                            return waitFor()
                          })

                          // Thenable object
                          .then(function () {
                            return {
                              then: function (next) {
                                setTimeout(function () {
                                  next('done')
                                }, 10)
                              }
                            }
                          })

                          // Wrap-up
                          .then(function (value) {
                            expect(value).to.equal('done')
                            done()
                          })

        chain.process()
      })

      it('can be array of parameters', function (done) {
        var thisObject = {
          me: [1]
        }
        var chain = new Chain(
          [
            waitFor,
            thisObject,
            2,
            'arg'
          ],
          [
            function () {
              expect(slice(arguments)).to.deep.equal([3, null, [2, 'arg']])
              expect(this).to.have.a.property('me').that.deep.equal([1])
            },
            thisObject,
            3,
            null
          ]
        )

        chain.then([
          function (value) {
            expect(value).to.be.an('undefined')
            done()
          }
        ])
      })
    })
  })
}))
