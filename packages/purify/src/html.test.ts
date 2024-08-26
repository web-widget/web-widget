import { escapeHtml } from './html';

describe('escapeHtml', () => {
  describe('when string is undefined', () => {
    test('should return "undefined"', () => {
      expect(escapeHtml(undefined as any)).toBe('undefined');
    });
  });

  describe('when string is null', () => {
    test('should return "null"', () => {
      expect(escapeHtml(null as any)).toBe('null');
    });
  });

  describe('when string is a number', () => {
    test('should return stringified number', () => {
      expect(escapeHtml(42 as any)).toBe('42');
    });
  });

  describe('when string is an object', () => {
    test('should return "[object Object]"', () => {
      expect(escapeHtml({} as any)).toBe('[object Object]');
    });
  });

  describe("when string contains '\"'", () => {
    describe('as only character', () => {
      test('should replace with "&quot;"', () => {
        expect(escapeHtml('"')).toBe('&quot;');
      });
    });

    describe('as first character', () => {
      test('should replace with "&quot;"', () => {
        expect(escapeHtml('"bar')).toBe('&quot;bar');
      });
    });

    describe('as last character', () => {
      test('should replace with "&quot;"', () => {
        expect(escapeHtml('foo"')).toBe('foo&quot;');
      });
    });

    describe('as middle character', () => {
      test('should replace with "&quot;"', () => {
        expect(escapeHtml('foo"bar')).toBe('foo&quot;bar');
      });
    });

    describe('multiple times', () => {
      test('should replace all occurrences with "&quot;"', () => {
        expect(escapeHtml('foo""bar')).toBe('foo&quot;&quot;bar');
      });
    });
  });

  describe('when string contains "&"', () => {
    describe('as only character', () => {
      test('should replace with "&amp;"', () => {
        expect(escapeHtml('&')).toBe('&amp;');
      });
    });

    describe('as first character', () => {
      test('should replace with "&amp;"', () => {
        expect(escapeHtml('&bar')).toBe('&amp;bar');
      });
    });

    describe('as last character', () => {
      test('should replace with "&amp;"', () => {
        expect(escapeHtml('foo&')).toBe('foo&amp;');
      });
    });

    describe('as middle character', () => {
      test('should replace with "&amp;"', () => {
        expect(escapeHtml('foo&bar')).toBe('foo&amp;bar');
      });
    });

    describe('multiple times', () => {
      test('should replace all occurrences with "&amp;"', () => {
        expect(escapeHtml('foo&&bar')).toBe('foo&amp;&amp;bar');
      });
    });
  });

  describe('when string contains "\'"', () => {
    describe('as only character', () => {
      test('should replace with "&#39;"', () => {
        expect(escapeHtml("'")).toBe('&#39;');
      });
    });

    describe('as first character', () => {
      test('should replace with "&#39;"', () => {
        expect(escapeHtml("'bar")).toBe('&#39;bar');
      });
    });

    describe('as last character', () => {
      test('should replace with "&#39;"', () => {
        expect(escapeHtml("foo'")).toBe('foo&#39;');
      });
    });

    describe('as middle character', () => {
      test('should replace with "&#39;"', () => {
        expect(escapeHtml("foo'bar")).toBe('foo&#39;bar');
      });
    });

    describe('multiple times', () => {
      test('should replace all occurrences with "&#39;"', () => {
        expect(escapeHtml("foo''bar")).toBe('foo&#39;&#39;bar');
      });
    });
  });

  describe('when string contains "<"', () => {
    describe('as only character', () => {
      test('should replace with "&lt;"', () => {
        expect(escapeHtml('<')).toBe('&lt;');
      });
    });

    describe('as first character', () => {
      test('should replace with "&lt;"', () => {
        expect(escapeHtml('<bar')).toBe('&lt;bar');
      });
    });

    describe('as last character', () => {
      test('should replace with "&lt;"', () => {
        expect(escapeHtml('foo<')).toBe('foo&lt;');
      });
    });

    describe('as middle character', () => {
      test('should replace with "&lt;"', () => {
        expect(escapeHtml('foo<bar')).toBe('foo&lt;bar');
      });
    });

    describe('multiple times', () => {
      test('should replace all occurrences with "&lt;"', () => {
        expect(escapeHtml('foo<<bar')).toBe('foo&lt;&lt;bar');
      });
    });
  });

  describe('when string contains ">"', () => {
    describe('as only character', () => {
      test('should replace with "&gt;"', () => {
        expect(escapeHtml('>')).toBe('&gt;');
      });
    });

    describe('as first character', () => {
      test('should replace with "&gt;"', () => {
        expect(escapeHtml('>bar')).toBe('&gt;bar');
      });
    });

    describe('as last character', () => {
      test('should replace with "&gt;"', () => {
        expect(escapeHtml('foo>')).toBe('foo&gt;');
      });
    });

    describe('as middle character', () => {
      test('should replace with "&gt;"', () => {
        expect(escapeHtml('foo>bar')).toBe('foo&gt;bar');
      });
    });

    describe('multiple times', () => {
      test('should replace all occurrences with "&gt;"', () => {
        expect(escapeHtml('foo>>bar')).toBe('foo&gt;&gt;bar');
      });
    });
  });

  describe('when escaped character mixed', () => {
    test('should escape all occurrences', () => {
      expect(escapeHtml('&foo <> bar "fizz" l\'a')).toBe(
        '&amp;foo &lt;&gt; bar &quot;fizz&quot; l&#39;a'
      );
    });
  });
});
