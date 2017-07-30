# promise-chaining

[![node](https://img.shields.io/node/v/promise-chaining.svg?style=flat-square)](https://www.npmjs.com/package/promise-chaining)
[![npm version](https://img.shields.io/npm/v/promise-chaining.svg?style=flat-square)](https://www.npmjs.com/package/promise-chaining)
[![npm downloads](https://img.shields.io/npm/dt/promise-chaining.svg?style=flat-square)](https://www.npmjs.com/package/promise-chaining)
[![GitHub release](https://img.shields.io/github/release/kulikala/promise-chaining.svg?style=flat-square)](https://github.com/kulikala/promise-chaining/releases/latest)
[![MIT License](https://img.shields.io/badge/licence-MIT-blue.svg?style=flat-square)](LICENSE)

Yet another wrapper library for `Promise` chaining.

## Why chaining?

There are many `Promise` implementations.
Not only that, you might use `Deferred` preferably.
And there's a possibility that one of libraries you use returns custom-made thenable object.

Now you need to chain them.
Of course, chained functions/objects should wait for previous ones to finish execution.
Some thenable implementations might not handle thenable objects passed to `resolve()` function.

This `Chain` library supports chaining of those 'immature' `Promise` implementations.

```javascript
var promise1 = new Promise(function (resolve1) {
  doAsyncTask(function () {
    var promise2 = new Promise(function (resolve2) {
      doAsyncTask(function () {
        resolve2('2nd task has done')
      })
    })

    resolve1(promise2)
  })
})

promise1.then(function (ret) {
  // This callback should be called after promise2 has resolved
  console.log(ret) // -> should be '2nd task has done'
})
```

## Example

### 1: Using `Chain`

```javascript
var chain = new Chain(promiseGenerator(1))
// -> Task 1: start

if (SOME_CONDITION /* true, for example */) {
  chain.then([promiseGenerator, null, 2])
  // Same with: chain.then(promiseGenerator.bind(null, 2))
}

chain.then(function () {
  return new Promise(function (resolve) {
    console.log('Task 3: start')

    doAsyncTask(function () {
      console.log('Task 3: done')

      resolve(promiseGenerator(4))
    })
  })
})

if (OTHER_CONDITION /* true, for example */) {
  chain.then([thenableGenerator, null, 5])
  // Same with: chain.then(promiseGenerator.bind(null, 5))
}

chain.then(function () {
  console.log('All done')
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
```

### 2: Equivalent code using ES2015 `Promise`

```javascript
var chain = promiseGenerator(1)
// -> Task 1: start

if (SOME_CONDITION /* true, for example */) {
  chain = chain.then(promiseGenerator.bind(null, 2))
}

chain = chain.then(function () {
  return new Promise(function (resolve) {
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
```

### Predefined variables/functions for example codes above

```javascript
// Example definition
var SOME_CONDITION = true
var OTHER_CONDITION = true

function promiseGenerator(n, arg) {
  // Creates and returns promise object
  return new Promise(function (resolve) {
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
```

## Installation

``` bash
$ npm install promise-chaining --save
```

## APIs

Please read [`test/promise-chaining.spec.js`](test/promise-chaining.spec.js) for available APIs and example usages.

## Usage

### AMD

```javascript
define(['promise-chaining/src/promise-chaining'], function (Chain) {
  var chain = new Chain()
})
```

### Browser globals

Load script first:

```html
<script src="promise-chaining/src/promise-chaining.js"></script>
```

yields global class function `Chain`.

With `Chain` class:

```javascript
var chain = new Chain()
```

### Node.js

```javascript
const Chain = require('promise-chaining')

let chain = new Chain()
```

## Issues

Feel free to submit issues and enhancement requests.

## Contributing

Please refer to [JavaScript Standard Style](https://standardjs.com/) and follow the guideline for submitting patches and additions.

I slightly modified the rule for this project... **no space after function name** because Sublime Text fails to parse function names if there's space after function name:

```javascript
function name(arg) { ... }
```

See [.eslintrc](.eslintrc) for detail.

## License

`promise-chaining` is made available under the terms of the [MIT license](LICENSE).
