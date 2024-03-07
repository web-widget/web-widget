import { fresh } from './fresh';

describe('fresh(new Headers(reqHeaders), new Headers(resHeaders))', function () {
  describe('when a non-conditional GET is performed', function () {
    test('should be stale', function () {
      expect(fresh(new Headers(), new Headers())).toBe(false);
    });
  });

  describe('when requested with If-None-Match', function () {
    describe('when ETags match', function () {
      test('should be fresh', function () {
        expect(
          fresh(
            new Headers({ 'if-none-match': '"foo"' }),
            new Headers({ etag: '"foo"' })
          )
        ).toBe(true);
      });
    });

    describe('when ETags mismatch', function () {
      test('should be stale', function () {
        expect(
          fresh(
            new Headers({ 'if-none-match': '"foo"' }),
            new Headers({ etag: '"bar"' })
          )
        ).toBe(false);
      });
    });

    describe('when at least one matches', function () {
      test('should be fresh', function () {
        expect(
          fresh(
            new Headers({ 'if-none-match': ' "bar" , "foo"' }),
            new Headers({ etag: '"foo"' })
          )
        ).toBe(true);
      });
    });

    describe('when etag is missing', function () {
      test('should be stale', function () {
        expect(
          fresh(new Headers({ 'if-none-match': '"foo"' }), new Headers())
        ).toBe(false);
      });
    });

    describe('when ETag is weak', function () {
      test('should be fresh on exact match', function () {
        expect(
          fresh(
            new Headers({ 'if-none-match': 'W/"foo"' }),
            new Headers({ etag: 'W/"foo"' })
          )
        ).toBe(true);
      });

      test('should be fresh on strong match', function () {
        expect(
          fresh(
            new Headers({ 'if-none-match': 'W/"foo"' }),
            new Headers({ etag: '"foo"' })
          )
        ).toBe(true);
      });
    });

    describe('when ETag is strong', function () {
      test('should be fresh on exact match', function () {
        expect(
          fresh(
            new Headers({ 'if-none-match': '"foo"' }),
            new Headers({ etag: '"foo"' })
          )
        ).toBe(true);
      });

      test('should be fresh on weak match', function () {
        expect(
          fresh(
            new Headers({ 'if-none-match': '"foo"' }),
            new Headers({ etag: 'W/"foo"' })
          )
        ).toBe(true);
      });
    });

    describe('when * is given', function () {
      test('should be fresh', function () {
        expect(
          fresh(
            new Headers({ 'if-none-match': '*' }),
            new Headers({ etag: '"foo"' })
          )
        ).toBe(true);
      });

      test('should get ignored if not only value', function () {
        expect(
          fresh(
            new Headers({ 'if-none-match': '*, "bar"' }),
            new Headers({ etag: '"foo"' })
          )
        ).toBe(false);
      });
    });
  });

  describe('when requested with If-Modified-Since', function () {
    describe('when modified since the date', function () {
      test('should be stale', function () {
        expect(
          fresh(
            new Headers({
              'if-modified-since': 'Sat, 01 Jan 2000 00:00:00 GMT',
            }),
            new Headers({ 'last-modified': 'Sat, 01 Jan 2000 01:00:00 GMT' })
          )
        ).toBe(false);
      });
    });

    describe('when unmodified since the date', function () {
      test('should be fresh', function () {
        expect(
          fresh(
            new Headers({
              'if-modified-since': 'Sat, 01 Jan 2000 01:00:00 GMT',
            }),
            new Headers({ 'last-modified': 'Sat, 01 Jan 2000 00:00:00 GMT' })
          )
        ).toBe(true);
      });
    });

    describe('when Last-Modified is missing', function () {
      test('should be stale', function () {
        expect(
          fresh(
            new Headers({
              'if-modified-since': 'Sat, 01 Jan 2000 00:00:00 GMT',
            }),
            new Headers({})
          )
        ).toBe(false);
      });
    });

    describe('with invalid If-Modified-Since date', function () {
      test('should be stale', function () {
        expect(
          fresh(
            new Headers({ 'if-modified-since': 'foo' }),
            new Headers({ 'last-modified': 'Sat, 01 Jan 2000 00:00:00 GMT' })
          )
        ).toBe(false);
      });
    });

    describe('with invalid Last-Modified date', function () {
      test('should be stale', function () {
        expect(
          fresh(
            new Headers({
              'if-modified-since': 'Sat, 01 Jan 2000 00:00:00 GMT',
            }),
            new Headers({ 'last-modified': 'foo' })
          )
        ).toBe(false);
      });
    });
  });

  describe('when requested with If-Modified-Since and If-None-Match', function () {
    describe('when both match', function () {
      test('should be fresh', function () {
        expect(
          fresh(
            new Headers({
              'if-none-match': '"foo"',
              'if-modified-since': 'Sat, 01 Jan 2000 01:00:00 GMT',
            }),
            new Headers({
              etag: '"foo"',
              'last-modified': 'Sat, 01 Jan 2000 00:00:00 GMT',
            })
          )
        ).toBe(true);
      });
    });

    describe('when only ETag matches', function () {
      test('should be stale', function () {
        expect(
          fresh(
            new Headers({
              'if-none-match': '"foo"',
              'if-modified-since': 'Sat, 01 Jan 2000 00:00:00 GMT',
            }),
            new Headers({
              etag: '"foo"',
              'last-modified': 'Sat, 01 Jan 2000 01:00:00 GMT',
            })
          )
        ).toBe(false);
      });
    });

    describe('when only Last-Modified matches', function () {
      test('should be stale', function () {
        expect(
          fresh(
            new Headers({
              'if-none-match': '"foo"',
              'if-modified-since': 'Sat, 01 Jan 2000 01:00:00 GMT',
            }),
            new Headers({
              etag: '"bar"',
              'last-modified': 'Sat, 01 Jan 2000 00:00:00 GMT',
            })
          )
        ).toBe(false);
      });
    });

    describe('when none match', function () {
      test('should be stale', function () {
        expect(
          fresh(
            new Headers({
              'if-none-match': '"foo"',
              'if-modified-since': 'Sat, 01 Jan 2000 00:00:00 GMT',
            }),
            new Headers({
              etag: '"bar"',
              'last-modified': 'Sat, 01 Jan 2000 01:00:00 GMT',
            })
          )
        ).toBe(false);
      });
    });
  });

  describe('when requested with Cache-Control: no-cache', function () {
    test('should be stale', function () {
      expect(
        fresh(new Headers({ 'cache-control': ' no-cache' }), new Headers({}))
      ).toBe(false);
    });

    describe('when ETags match', function () {
      test('should be stale', function () {
        expect(
          fresh(
            new Headers({
              'cache-control': ' no-cache',
              'if-none-match': '"foo"',
            }),
            new Headers({ etag: '"foo"' })
          )
        ).toBe(false);
      });
    });

    describe('when unmodified since the date', function () {
      test('should be stale', function () {
        expect(
          fresh(
            new Headers({
              'cache-control': ' no-cache',
              'if-modified-since': 'Sat, 01 Jan 2000 01:00:00 GMT',
            }),
            new Headers({ 'last-modified': 'Sat, 01 Jan 2000 00:00:00 GMT' })
          )
        ).toBe(false);
      });
    });
  });
});
