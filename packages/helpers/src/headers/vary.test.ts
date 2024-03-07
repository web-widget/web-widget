import { vary } from './vary';

describe('vary(res, field)', function () {
  describe('arguments', function () {
    describe('res', function () {
      test('should be required', function () {
        expect(() => {
          // @ts-expect-error
          vary();
        }).toThrow('headers argument is required');
      });

      test('should not allow non-res-like objects', function () {
        expect(() => {
          // @ts-expect-error
          vary(null, {});
        }).toThrow('headers argument is required');
      });
    });
  });

  describe('when no Vary', function () {
    test('should set value', function () {
      const headers = new Headers();
      vary(headers, 'Origin');
      expect(headers.get('Vary')).toBe('Origin');
    });

    test('should set value with multiple calls', function () {
      const headers = new Headers();
      vary(headers, ['Origin', 'User-Agent']);
      expect(headers.get('Vary')).toBe('Origin, User-Agent');
    });

    test('should preserve case', function () {
      const headers = new Headers();
      vary(headers, ['ORIGIN', 'user-agent', 'AccepT']);
      expect(headers.get('Vary')).toBe('ORIGIN, user-agent, AccepT');
    });

    test('should not set Vary on empty array', function () {
      const headers = new Headers();
      vary(headers, []);
      expect(headers.get('Vary')).toBe(null);
    });
  });

  describe('when existing Vary', function () {
    test('should set value', function () {
      const headers = new Headers();
      headers.set('Vary', 'Accept');
      vary(headers, 'Origin');
      expect(headers.get('Vary')).toBe('Accept, Origin');
    });

    test('should set value with multiple calls', function () {
      const headers = new Headers();
      headers.set('Vary', 'Accept');
      vary(headers, 'Origin');
      vary(headers, 'User-Agent');
      expect(headers.get('Vary')).toBe('Accept, Origin, User-Agent');
    });

    test('should not duplicate existing value', function () {
      const headers = new Headers();
      headers.set('Vary', 'Accept');
      vary(headers, 'Accept');
      expect(headers.get('Vary')).toBe('Accept');
    });

    test('should compare case-insensitive', function () {
      const headers = new Headers();
      headers.set('Vary', 'Accept');
      vary(headers, 'accEPT');
      expect(headers.get('Vary')).toBe('Accept');
    });

    test('should preserve case', function () {
      const headers = new Headers();
      headers.set('Vary', 'AccepT');
      vary(headers, ['accEPT', 'ORIGIN']);
      expect(headers.get('Vary')).toBe('AccepT, ORIGIN');
    });
  });

  describe('when existing Vary as array', function () {
    test('should set value', function () {
      const headers = new Headers();
      headers.set('Vary', 'Accept, Accept-Encoding');
      vary(headers, 'Origin');
      expect(headers.get('Vary')).toBe('Accept, Accept-Encoding, Origin');
    });

    test('should not duplicate existing value', function () {
      const headers = new Headers();
      headers.set('Vary', 'Accept, Accept-Encoding');
      vary(headers, 'Accept');
      expect(headers.get('Vary')).toBe('Accept, Accept-Encoding');
    });
  });

  describe('when Vary: *', function () {
    test('should set value', function () {
      const headers = new Headers();
      headers.set('Vary', '*');
      vary(headers, 'Origin');
      expect(headers.get('Vary')).toBe('*');
    });

    test('should act as if all values alread set', function () {
      const headers = new Headers();
      headers.set('Vary', '*');
      vary(headers, 'Origin');
      vary(headers, 'User-Agent');
      expect(headers.get('Vary')).toBe('*');
    });

    test('should erradicate existing values', function () {
      const headers = new Headers();
      headers.set('Vary', 'Accept, Accept-Encoding');
      vary(headers, '*');
      expect(headers.get('Vary')).toBe('*');
    });

    test('should update bad existing header', function () {
      const headers = new Headers();
      headers.set('Vary', 'Accept, Accept-Encoding, *');
      vary(headers, 'Origin');
      expect(headers.get('Vary')).toBe('*');
    });
  });

  describe('when field is string', function () {
    test('should set value', function () {
      const headers = new Headers();
      vary(headers, 'Accept');
      expect(headers.get('Vary')).toBe('Accept');
    });

    test('should set value when vary header', function () {
      const headers = new Headers();
      headers.set('Vary', 'Accept, Accept-Encoding');
      vary(headers, 'Origin');
      expect(headers.get('Vary')).toBe('Accept, Accept-Encoding, Origin');
    });

    test('should acept LWS', function () {
      const headers = new Headers();
      vary(headers, '  Accept     ,     Origin    ');
      expect(headers.get('Vary')).toBe('Accept, Origin');
    });

    test('should handle contained *', function () {
      const headers = new Headers();
      vary(headers, 'Accept,*');
      expect(headers.get('Vary')).toBe('*');
    });
  });

  describe('when field is array', function () {
    test('should set value', function () {
      const headers = new Headers();
      vary(headers, ['Accept', 'Accept-Language']);
      expect(headers.get('Vary')).toBe('Accept, Accept-Language');
    });

    test('should ignore double-entries', function () {
      const headers = new Headers();
      vary(headers, ['Accept', 'Accept']);
      expect(headers.get('Vary')).toBe('Accept');
    });

    test('should be case-insensitive', function () {
      const headers = new Headers();
      vary(headers, ['Accept', 'ACCEPT']);
      expect(headers.get('Vary')).toBe('Accept');
    });

    test('should handle contained *', function () {
      const headers = new Headers();
      vary(headers, ['Origin', 'User-Agent', '*', 'Accept']);
      expect(headers.get('Vary')).toBe('*');
    });

    test('should handle existing values', function () {
      const headers = new Headers();
      headers.set('Vary', 'Accept, Accept-Encoding');
      vary(headers, ['origin', 'accept', 'accept-charset']);
      expect(headers.get('Vary')).toBe(
        'Accept, Accept-Encoding, origin, accept-charset'
      );
    });
  });
});
