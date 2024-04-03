import { assertEquals, assertInstanceOf, assertRejects } from "@std/assert";
import { it } from "@std/testing/bdd";
import { assertSpyCallArgs, assertSpyCalls, spy } from "@std/testing/mock";

// @ts-expect-error: testing polyfill
delete Promise.withResolvers;
await import("./promise-with-resolvers-polyfill.ts");

it("should allow for custom promises", () => {
  const resolveSpy = spy();
  const rejectSpy = spy();
  class NotPromise<T> {
    constructor(
      executor: (
        resolve: (value: T) => void,
        reject: (reason: unknown) => void,
      ) => void,
    ) {
      executor(resolveSpy, rejectSpy);
    }
  }

  const { promise, resolve, reject } = Promise.withResolvers.call(NotPromise);
  assertInstanceOf(promise, NotPromise);

  resolve("resolved");
  assertSpyCalls(resolveSpy, 1);
  assertSpyCallArgs(resolveSpy, 0, ["resolved"]);

  reject(new Error("rejected"));
  assertSpyCalls(rejectSpy, 1);
  assertSpyCallArgs(rejectSpy, 0, [new Error("rejected")]);
});

it("should resolve the given promise when calling resolve", async () => {
  const { promise, resolve } = Promise.withResolvers();
  resolve(1);
  assertEquals(await promise, 1);
});

it("should reject the given promise when calling reject", async () => {
  const { promise, reject } = Promise.withResolvers();
  reject(new Error("test failure"));
  await assertRejects(() => promise, Error, "test failure");
});
