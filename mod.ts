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
 *     const products = await fetch(`/products?page=${page}`).then((res) =>
 *       res.json()
 *     );
 *     yield products.map((product) =>
 *       fetch(`/product/${product.id}/details`).then((res) => res.json())
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

/** Various options to configure the behavior of the {@link parallelizeGeneratorPromises} utility. */
export interface ParallelizeGeneratorPromisesOptions {
  /**
   * Limits the maximum number of promises that can be buffered at any given time.
   * Useful to manage memory usage in the case where you are generating a lot of promises that aren't being consumed at a fast enough rate.
   *
   * **NOTE: this value must be greater than or equal to 1.**
   *
   * By default this is `undefined` which means there is no limit set.
   *
   * @default undefined
   */
  maxBufferedPromises?: number;
}

/**
 * Utility to run arrays of promises yielded by a given generator in parallel.
 *
 * @param generator Promises-yielding generator function to parallelize.
 * @param {ParallelizeGeneratorPromisesOptions} options Various options to configure the behavior of this utility.
 */
export async function* parallelizeGeneratorPromises<T>(
  generator: () => Generator<Promise<T>[]> | AsyncGenerator<Promise<T>[]>,
  { maxBufferedPromises }: ParallelizeGeneratorPromisesOptions = {},
): AsyncGenerator<T, void, undefined> {
  const bufferedPromises: Promise<T>[] = [];
  const bufferedPromisesResolvers: ((promise: Promise<T>) => void)[] = [];
  let done = false;
  let error;
  let {
    promise: inputGeneratorYieldPromise,
    resolve: inputGeneratorYieldPromiseResolve,
  } = Promise.withResolvers<void>();
  let {
    promise: outputGeneratorYieldPromise,
    resolve: outputGeneratorYieldPromiseResolve,
  } = Promise.withResolvers<void>();

  (async () => {
    try {
      for await (const promises of generator()) {
        while (
          maxBufferedPromises && bufferedPromises.length >= maxBufferedPromises
        ) {
          await outputGeneratorYieldPromise;
        }
        for (const promise of promises) {
          const { promise: bufferedPromise, resolve: bufferedPromiseResolve } =
            Promise.withResolvers<T>();
          bufferedPromises.push(bufferedPromise);
          bufferedPromisesResolvers.push(bufferedPromiseResolve);
          promise
            .catch(() => {})
            .finally(() => {
              bufferedPromisesResolvers.shift()!(promise);
            });
        }
        inputGeneratorYieldPromiseResolve();
        ({
          promise: inputGeneratorYieldPromise,
          resolve: inputGeneratorYieldPromiseResolve,
        } = Promise.withResolvers<void>());
      }
    } catch (e) {
      error = e;
    } finally {
      done = true;
    }
  })();

  while (!done) {
    await inputGeneratorYieldPromise;
    while (bufferedPromises.length > 0) {
      yield bufferedPromises.shift()!;
      outputGeneratorYieldPromiseResolve();
      ({
        promise: outputGeneratorYieldPromise,
        resolve: outputGeneratorYieldPromiseResolve,
      } = Promise.withResolvers<void>());
    }
  }

  if (error) {
    throw error;
  }
}
