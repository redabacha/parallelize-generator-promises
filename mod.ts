/**
 * @module
 *
 * This is the main module for the {@link parallelizeGeneratorPromises} utility.
 *
 * Usage:
 * ```js
 * import { parallelizeGeneratorPromises } from "parallelize-generator-promises";
 *
 * async function* getAllProductDetails() {
 *   for (let page = 1; page <= 100; page++) {
 *     const productsPromise = fetch(`/products?page=${page}`).then((res) =>
 *       res.json()
 *     );
 *     yield productsPromise.then((products) =>
 *       products.map(async (product) =>
 *         fetch(`/product/${product.id}/details`).then((res) => res.json())
 *       )
 *     );
 *   }
 * }
 *
 * for await (
 *   const productDetails of parallelizeGeneratorPromises(
 *     getAllProductDetails(),
 *   )
 * ) {
 *   console.log(productDetails);
 * }
 * ```
 *
 * The above example will fetch all product details for one page of products at a
 * time as fast as possible, yielding the product details in the fastest order
 * possible to keep the iterator fed.
 *
 * If a concurrency limit is required, this utility pairs very well with a
 * semaphore library such as [async-sema](https://github.com/vercel/async-sema).
 */

/**
 * Utility to run arrays of promises yielded by a given generator in parallel.
 *
 * @param generator Promises-yielding generator function to parallelize.
 */
export async function* parallelizeGeneratorPromises<T>(
  generator: () => Generator<Promise<T>[]> | AsyncGenerator<Promise<T>[]>,
): AsyncGenerator<T, void, undefined> {
  const bufferedPromises: Promise<T>[] = [];
  const resolvers: ((promise: Promise<T>) => void)[] = [];
  let done = false;
  let error;
  let promiseResolve: () => void = () => {};
  let promise = new Promise<void>((resolve) => (promiseResolve = resolve));

  (async () => {
    try {
      for await (const promises of generator()) {
        for (const bufferedPromise of promises) {
          bufferedPromises.push(
            new Promise((resolve) => resolvers.push(resolve)),
          );
          bufferedPromise
            .catch(() => {})
            .finally(() => {
              resolvers.shift()!(bufferedPromise);
            });
        }
        promiseResolve();
        promise = new Promise<void>((resolve) => (promiseResolve = resolve));
      }
    } catch (e) {
      error = e;
    } finally {
      done = true;
    }
  })();

  while (!done) {
    await promise;
    while (bufferedPromises.length > 0) {
      const bufferedPromise = bufferedPromises.shift();
      if (bufferedPromise) {
        yield bufferedPromise;
      }
    }
  }

  if (error) {
    throw error;
  }
}
