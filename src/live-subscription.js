export function createLiveSubscription(connection, callback) {
  let stopRequested = false;
  let unsubscribeStarted = false;
  let setupFailed = false;
  let unsubscribe = null;
  let resolveStopped;
  const stopped = new Promise((resolve) => {
    resolveStopped = resolve;
  });

  const performUnsubscribe = () => {
    if (unsubscribeStarted) return;
    unsubscribeStarted = true;

    let unsubscribeResult;
    try {
      unsubscribeResult =
        typeof unsubscribe === 'function' ? unsubscribe() : undefined;
    } catch {
      unsubscribeResult = undefined;
    }

    Promise.resolve(unsubscribeResult)
      .catch(() => undefined)
      .then(() => {
        unsubscribe = null;
        resolveStopped();
      });
  };

  const ready = Promise.resolve()
    .then(() => connection.subscribeEvents(callback, 'state_changed'))
    .then((unsubscribeCallback) => {
      unsubscribe = unsubscribeCallback;
      if (stopRequested) performUnsubscribe();
    })
    .catch((error) => {
      setupFailed = true;
      if (stopRequested) resolveStopped();
      throw error;
    });

  return {
    ready,
    stop() {
      if (!stopRequested) {
        stopRequested = true;
        if (setupFailed) resolveStopped();
        else if (unsubscribe !== null) performUnsubscribe();
      }
      return stopped;
    },
  };
}
