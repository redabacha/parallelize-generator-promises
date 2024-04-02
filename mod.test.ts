import {
  assert,
  assertEquals,
  assertIsError,
  assertRejects,
} from "@std/assert";
import { delay } from "@std/async";
import { it } from "@std/testing/bdd";
import { parallelizeGeneratorPromises } from "./mod.ts";

const assertWithinRange = (value: number, min: number, max: number) => {
  assert(
    value >= min && value <= max,
    `value ${value} not within range [${min}, ${max}]`,
  );
};

it("should return an async generator yielding promises in fastest order", async () => {
  const results = [];
  const resultTimes = [];
  const startTime = Date.now();

  for await (
    const result of parallelizeGeneratorPromises(function* () {
      yield [
        delay(100).then(() => 3),
        delay(50).then(() => 2),
        delay(150).then(() => 4),
      ];
      yield [delay(0).then(() => 1), delay(200).then(() => 5)];
    })
  ) {
    results.push(result);
    resultTimes.push(Date.now() - startTime);
  }

  assertEquals(results, [1, 2, 3, 4, 5]);

  // measured durations will have some degree of inaccuracy
  assertWithinRange(resultTimes[0], 0, 5);
  assertWithinRange(resultTimes[1], 45, 55);
  assertWithinRange(resultTimes[2], 95, 105);
  assertWithinRange(resultTimes[3], 145, 155);
  assertWithinRange(resultTimes[4], 195, 205);
});

it("should passthrough if input generator throws an error", async () => {
  const results: number[] = [];
  await assertRejects(
    async () => {
      for await (
        const result of parallelizeGeneratorPromises(function* () {
          yield [delay(10).then(() => 1)];
          throw new Error("test failure");
        })
      ) {
        results.push(result);
      }
    },
    Error,
    "test failure",
  );
  assertEquals(results, [1]);
});

it("should passthrough if input generator promise throws an error", async () => {
  try {
    for await (
      const _result of parallelizeGeneratorPromises(function* () {
        yield [Promise.reject(new Error("test failure"))];
      })
    ) {
      throw new Error("should not be reached");
    }
  } catch (e) {
    assertIsError(e, Error, "test failure");
  }
});

it("should not buffer more promises once maxBufferedPromises is reached", async () => {
  const results: number[] = [];
  const { promise, resolve } = Promise.withResolvers<void>();
  let generatorYielded = false;
  let generatorYieldedEarly = false;

  delay(0).then(() => {
    generatorYieldedEarly = generatorYielded;
    resolve();
  });
  for await (
    const result of parallelizeGeneratorPromises(function* () {
      yield [promise.then(() => 1)];
      yield [promise.then(() => 2)]; // generator should wait here until promise is resolved
      yield [promise.then(() => 3)];
      generatorYielded = true;
    }, { maxBufferedPromises: 1 })
  ) {
    results.push(result);
  }

  assertEquals(results, [1, 2, 3]);
  assert(!generatorYieldedEarly, "generator yielded too early");
});
