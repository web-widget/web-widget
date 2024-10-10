import WebRouter from '@web-widget/web-router';
import timing, { endTime, setMetric, startTime } from './timing';

function text(content: string): Response {
  return new Response(content, {
    headers: {
      'content-type': 'text/plain',
    },
  });
}

describe('Server-Timing API', () => {
  const app = new WebRouter();

  const totalDescription = 'my total DescRipTion!';
  const name = 'sleep';
  const region = 'region';
  const regionDesc = 'europe-west3';

  app.use(
    '*',
    timing({
      totalDescription,
    })
  );
  app.get('/', () => text('/'));
  app.get('/api', async (context) => {
    startTime(context, name);
    await new Promise((r) => setTimeout(r, 30));
    endTime(context, name);

    return text('api!');
  });
  app.get('/cache', async (context) => {
    setMetric(context, region, regionDesc);

    return text('cache!');
  });

  test('should contain total duration', async () => {
    const res = await app.dispatch('http://localhost/');
    expect(res).not.toBeNull();
    expect(res.headers.has('server-timing')).toBeTruthy();
    expect(
      res.headers.get('server-timing')?.includes('total;dur=')
    ).toBeTruthy();
    expect(
      res.headers.get('server-timing')?.includes(totalDescription)
    ).toBeTruthy();
  });

  test('should contain value metrics', async () => {
    const res = await app.dispatch('http://localhost/api');
    expect(res).not.toBeNull();
    expect(res.headers.has('server-timing')).toBeTruthy();
    expect(
      res.headers.get('server-timing')?.includes(`${name};dur=`)
    ).toBeTruthy();
    expect(res.headers.get('server-timing')?.includes(name)).toBeTruthy();
  });

  test('should contain value-less metrics', async () => {
    const res = await app.dispatch('http://localhost/cache');
    expect(res).not.toBeNull();
    expect(res.headers.has('server-timing')).toBeTruthy();
    expect(
      res.headers
        .get('server-timing')
        ?.includes(`${region};desc="${regionDesc}"`)
    ).toBeTruthy();
    expect(res.headers.get('server-timing')?.includes(region)).toBeTruthy();
    expect(res.headers.get('server-timing')?.includes(regionDesc)).toBeTruthy();
  });

  describe('should handle crossOrigin setting', () => {
    test('should do nothing when crossOrigin is falsy', async () => {
      const crossOriginApp = new WebRouter();

      crossOriginApp.use(
        '*',
        timing({
          crossOrigin: false,
        })
      );

      crossOriginApp.get('/', () => text('/'));

      const res = await crossOriginApp.dispatch('http://localhost/');

      expect(res).not.toBeNull();
      expect(res.headers.has('server-timing')).toBeTruthy();
      expect(res.headers.has('timing-allow-origin')).toBeFalsy();
    });

    test('should set Timing-Allow-Origin to * when crossOrigin is true', async () => {
      const crossOriginApp = new WebRouter();

      crossOriginApp.use(
        '*',
        timing({
          crossOrigin: true,
        })
      );

      crossOriginApp.get('/', () => text('/'));

      const res = await crossOriginApp.dispatch('http://localhost/');

      expect(res).not.toBeNull();
      expect(res.headers.has('server-timing')).toBeTruthy();
      expect(res.headers.has('timing-allow-origin')).toBeTruthy();
      expect(res.headers.get('timing-allow-origin')).toBe('*');
    });

    test('should set Timing-Allow-Origin to the value of crossOrigin when it is a string', async () => {
      const crossOriginApp = new WebRouter();

      crossOriginApp.use(
        '*',
        timing({
          crossOrigin: 'https://example.com',
        })
      );

      crossOriginApp.get('/', () => text('/'));

      const res = await crossOriginApp.dispatch('http://localhost/');

      expect(res).not.toBeNull();
      expect(res.headers.has('server-timing')).toBeTruthy();
      expect(res.headers.has('timing-allow-origin')).toBeTruthy();
      expect(res.headers.get('timing-allow-origin')).toBe(
        'https://example.com'
      );
    });

    test('should set Timing-Allow-Origin to the return value of crossOrigin when it is a function', async () => {
      const crossOriginApp = new WebRouter();

      crossOriginApp.use(
        '*',
        timing({
          crossOrigin: (context) =>
            context.request.headers.get('origin') ?? '*',
        })
      );

      crossOriginApp.get('/', () => text('/'));

      const res = await crossOriginApp.dispatch('http://localhost/', {
        headers: {
          origin: 'https://example.com',
        },
      });

      expect(res).not.toBeNull();
      expect(res.headers.has('server-timing')).toBeTruthy();
      expect(res.headers.has('timing-allow-origin')).toBeTruthy();
      expect(res.headers.get('timing-allow-origin')).toBe(
        'https://example.com'
      );
    });
  });

  test('should throw an error when name is an invalid string', async () => {
    const invalidNameApp = new WebRouter();

    invalidNameApp.use('*', timing());

    invalidNameApp.get('/invalid', (context) => {
      expect(() => startTime(context, 'a b?;')).toThrow(
        'Invalid Server-Timing name: a b?;'
      );
      return text('invalid');
    });

    const res = await invalidNameApp.dispatch('http://localhost/invalid');
    expect(res).not.toBeNull();
  });
});
