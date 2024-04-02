if (!Promise.withResolvers) {
  Promise.withResolvers = function withResolvers<T>() {
    let promiseResolve: PromiseWithResolvers<T>["resolve"];
    let promiseReject: PromiseWithResolvers<T>["reject"];
    const promise = new this<T>((resolve, reject) => {
      promiseResolve = resolve;
      promiseReject = reject;
    });
    return { resolve: promiseResolve!, reject: promiseReject!, promise };
  };
}
