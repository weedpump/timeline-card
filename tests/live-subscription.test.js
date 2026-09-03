import { describe, expect, it, vi } from 'vitest';
import { createLiveSubscription } from '../src/live-subscription.js';

function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe('live event subscription lifecycle', () => {
  it('unsubscribes exactly once when stopped after setup', async () => {
    const unsubscribe = vi.fn();
    const connection = {
      subscribeEvents: vi.fn().mockResolvedValue(unsubscribe),
    };
    const subscription = createLiveSubscription(connection, vi.fn());

    await subscription.ready;
    subscription.stop();
    subscription.stop();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes exactly once when stopped before setup resolves', async () => {
    const pending = deferred();
    const unsubscribe = vi.fn();
    const connection = {
      subscribeEvents: vi.fn().mockReturnValue(pending.promise),
    };
    const subscription = createLiveSubscription(connection, vi.fn());

    const stopped = subscription.stop();
    pending.resolve(unsubscribe);
    await stopped;
    await subscription.ready;

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('handles a rejected asynchronous unsubscribe', async () => {
    const unsubscribe = vi
      .fn()
      .mockRejectedValue(new Error('unsubscribe failed'));
    const connection = {
      subscribeEvents: vi.fn().mockResolvedValue(unsubscribe),
    };
    const subscription = createLiveSubscription(connection, vi.fn());

    await subscription.ready;

    await expect(subscription.stop()).resolves.toBeUndefined();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('exposes subscription setup failures through ready', async () => {
    const connection = {
      subscribeEvents: vi.fn(() => {
        throw new Error('subscribe failed');
      }),
    };
    const subscription = createLiveSubscription(connection, vi.fn());

    await expect(subscription.ready).rejects.toThrow('subscribe failed');
    await expect(subscription.stop()).resolves.toBeUndefined();
  });
});
