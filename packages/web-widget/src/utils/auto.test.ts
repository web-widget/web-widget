import { scheduleAutoMount } from './auto';

describe('scheduleAutoMount', () => {
  it('starts every eligible widget without an artificial concurrency limit', async () => {
    const started: number[] = [];
    const resolveMounts: Array<() => void> = [];
    const disconnects = Array.from({ length: 5 }, (_, index) => {
      const element = document.createElement('div');
      return scheduleAutoMount(
        element,
        () =>
          new Promise<void>((resolve) => {
            started.push(index);
            resolveMounts.push(resolve);
          }),
        (_element, onVisible) => {
          onVisible();
          return () => {};
        }
      );
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(started).to.deep.equal([0, 1, 2, 3, 4]);
    resolveMounts.forEach((resolve) => resolve());
    disconnects.forEach((disconnect) => disconnect());
  });
});
