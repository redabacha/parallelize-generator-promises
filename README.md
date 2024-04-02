# parallelize-generator-promises

[![bundle size](https://pkg-size.dev/badge/bundle/553)](https://pkg-size.dev/parallelize-generator-promises)
[![codecov](https://codecov.io/gh/redabacha/parallelize-generator-promises/graph/badge.svg?token=43rmo14Sa3)](https://codecov.io/gh/redabacha/parallelize-generator-promises)
[![JSR score](https://jsr.io/badges/@reda/parallelize-generator-promises/score)](https://jsr.io/@reda/parallelize-generator-promises/score)
[![JSR](https://jsr.io/badges/@reda/parallelize-generator-promises)](https://jsr.io/@reda/parallelize-generator-promises)
[![npm](https://shields.io/npm/v/parallelize-generator-promises)](https://www.npmjs.com/package/parallelize-generator-promises)
[![license](https://shields.io/github/license/redabacha/parallelize-generator-promises)](https://github.com/redabacha/parallelize-generator-promises/blob/main/LICENSE)

A simple utility to run promises yielded by a generator in parallel. This is
incredibly useful when you need to run a bunch of tasks as fast as possible
without waiting for one another.

## Installation

parallelize-generator-promises is available on both
[npm](https://www.npmjs.com/package/parallelize-generator-promises) and
[JSR](https://jsr.io/@reda/parallelize-generator-promises).

To use from npm, install the
[parallelize-generator-promises](https://www.npmjs.com/package/parallelize-generator-promises)
package and then import into a module:

```js
import { parallelizeGeneratorPromises } from "parallelize-generator-promises";
```

To use from JSR, install the
[@reda/parallelize-generator-promises](https://jsr.io/@reda/parallelize-generator-promises)
package and then import into a module:

```js
import { parallelizeGeneratorPromises } from "@reda/parallelize-generator-promises";
```

### Polyfilling Promise.withResolvers

If you are using Node.js v20 or below, you will require a polyfill for
[`Promise.withResolvers`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/withResolvers).

A polyfill for this is available in a separate export as part of this package.
To use the provided polyfill, import it at the entrypoint of your application.

npm:

```js
import "parallelize-generator-promises/promise-with-resolvers-polyfill";
```

jsr:

```js
import "@reda/parallelize-generator-promises/promise-with-resolvers-polyfill";
```

## Usage

```js
import { parallelizeGeneratorPromises } from "parallelize-generator-promises";

async function* getAllProductDetails() {
  for (let page = 1; page <= 100; page++) {
    const products = await fetch(`/products?page=${page}`).then((res) =>
      res.json()
    );
    yield products.map((product) =>
      fetch(`/product/${product.id}/details`).then((res) => res.json())
    );
  }
}

for await (
  const productDetails of parallelizeGeneratorPromises(
    getAllProductDetails(),
  )
) {
  console.log(productDetails);
}
```

The above example will fetch all product details for one page of products at a
time as fast as possible, yielding the product details in the fastest order
possible to keep the iterator fed.

If a concurrency limit is required, this utility pairs very well with a
semaphore library such as [async-sema](https://github.com/vercel/async-sema).

## Options

| Name                  | Description                                                                                                                                                                                                                                                                                                                                     |
| :-------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `maxBufferedPromises` | Limits the maximum number of promises that can be buffered at any given time. Useful to manage memory usage in the case where you are generating a lot of promises that aren't being consumed at a fast enough rate. **NOTE: this value must be greater than or equal to 1.** By default this is `undefined` which means there is no limit set. |
