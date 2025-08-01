/**
 * @fileoverview Radix Tree Router Tests
 * Tests for Radix Tree router implementation
 */

import { RadixTreeRouter } from './radix-tree';
import { CommonRouterTestRules } from './__tests__/base';

describe('RadixTreeRouter', () => {
  // Run all common tests
  CommonRouterTestRules.runAllTests(() => new RadixTreeRouter<string>());

  // RadixTree-specific tests
  describe('RadixTree-Specific Features', () => {
    let router: RadixTreeRouter<string>;

    beforeEach(() => {
      router = new RadixTreeRouter();
    });

    it('should support wildcards at the end', () => {
      router.add('GET', '/files/*', 'get-file');
      router.add('GET', '/api/*', 'api-catch-all');

      const result1 = router.match('GET', '/files/documents/report.pdf');
      expect(result1).toHaveLength(1);
      expect(result1[0][0]).toBe('get-file');
      expect(result1[0][1]).toEqual({ '*': 'documents/report.pdf' });

      const result2 = router.match('GET', '/api/users/123/posts');
      expect(result2).toHaveLength(1);
      expect(result2[0][0]).toBe('api-catch-all');
      expect(result2[0][1]).toEqual({ '*': 'users/123/posts' });
    });

    it('should support nested wildcards', () => {
      router.add('GET', '/api/users/:id/posts/*', 'get-user-posts');

      const result = router.match(
        'GET',
        '/api/users/123/posts/456/comments/789'
      );
      expect(result).toHaveLength(1);
      expect(result[0][0]).toBe('get-user-posts');
      expect(result[0][1]).toEqual({
        id: '123',
        '*': '456/comments/789',
      });
    });

    it('should handle complex parameter extraction', () => {
      router.add(
        'GET',
        '/api/:version/users/:id/posts/:postId/comments/:commentId',
        'get-comment'
      );

      const result = router.match(
        'GET',
        '/api/v1/users/123/posts/456/comments/789'
      );
      expect(result).toHaveLength(1);
      expect(result[0][0]).toBe('get-comment');
      expect(result[0][1]).toEqual({
        version: 'v1',
        id: '123',
        postId: '456',
        commentId: '789',
      });
    });
  });

  describe('RadixTree Limitations', () => {
    let router: RadixTreeRouter<string>;

    beforeEach(() => {
      router = new RadixTreeRouter();
    });

    it('should reject URLPattern groups', () => {
      expect(() => {
        router.add('GET', '/api/v{version}/users', 'handler');
      }).toThrow('Unsupported pattern in pathname: /api/v{version}/users');

      expect(() => {
        router.add('GET', '/users/{id}', 'handler');
      }).toThrow('Unsupported pattern in pathname: /users/{id}');
    });

    it('should reject regex constraints', () => {
      expect(() => {
        router.add('GET', '/users/{id:\\d+}', 'handler');
      }).toThrow('Unsupported pattern in pathname: /users/{id:\\d+}');

      expect(() => {
        router.add('GET', '/files/{name:\\w+}', 'handler');
      }).toThrow('Unsupported pattern in pathname: /files/{name:\\w+}');
    });

    it('should reject character classes', () => {
      expect(() => {
        router.add('GET', '/api/[abc]/users', 'handler');
      }).toThrow('Unsupported pattern in pathname: /api/[abc]/users');

      expect(() => {
        router.add('GET', '/files/[0-9]/data', 'handler');
      }).toThrow('Unsupported pattern in pathname: /files/[0-9]/data');
    });

    it('should reject optional segments', () => {
      expect(() => {
        router.add('GET', '/api/users/:id?', 'handler');
      }).toThrow('Unsupported pattern in pathname: /api/users/:id?');

      expect(() => {
        router.add('GET', '/api/users/:id/posts/:postId?', 'handler');
      }).toThrow(
        'Unsupported pattern in pathname: /api/users/:id/posts/:postId?'
      );
    });

    it('should reject wildcards in middle of path', () => {
      expect(() => {
        router.add('GET', '/api/*/users', 'handler');
      }).toThrow(
        'Wildcard (*) is only allowed at the end of the path: /api/*/users'
      );

      expect(() => {
        router.add('GET', '/files/*/data/*', 'handler');
      }).toThrow(
        'Wildcard (*) is only allowed at the end of the path: /files/*/data/*'
      );
    });

    it('should reject duplicate parameter names', () => {
      expect(() => {
        router.add('GET', '/users/:id/posts/:id', 'handler');
      }).toThrow(
        "Duplicate parameter name 'id' in pathname: /users/:id/posts/:id"
      );
    });
  });

  describe('RadixTree Edge Cases', () => {
    let router: RadixTreeRouter<string>;

    beforeEach(() => {
      router = new RadixTreeRouter();
    });

    it('should handle empty pathname', () => {
      expect(() => {
        router.add('GET', '', 'handler');
      }).not.toThrow();

      const result = router.match('GET', '');
      expect(result).toHaveLength(1);
    });

    it('should handle root path', () => {
      expect(() => {
        router.add('GET', '/', 'handler');
      }).not.toThrow();

      const result = router.match('GET', '/');
      expect(result).toHaveLength(1);
    });

    it('should handle single segment paths', () => {
      router.add('GET', '/users', 'get-users');
      router.add('GET', '/:section', 'get-section');

      const result1 = router.match('GET', '/users');
      expect(result1).toHaveLength(2); // Now returns both static and parameter matches
      // Check that both matches are present
      const handlers1 = result1.map((match) => match[0]);
      expect(handlers1).toContain('get-users');
      expect(handlers1).toContain('get-section');

      const result2 = router.match('GET', '/posts');
      expect(result2).toHaveLength(1);
      expect(result2[0][1]).toEqual({ section: 'posts' });
    });

    it('should handle consecutive slashes', () => {
      expect(() => {
        router.add('GET', '//users', 'handler');
      }).toThrow('Pathname cannot contain consecutive slashes');
    });
  });

  describe('RadixTree Performance Tests', () => {
    let router: RadixTreeRouter<string>;

    beforeEach(() => {
      router = new RadixTreeRouter();
    });

    it('should handle large number of routes efficiently', () => {
      // Add 100 routes
      for (let i = 0; i < 100; i++) {
        router.add('GET', `/api/v${i}/users`, `handler-${i}`);
        router.add('GET', `/api/v${i}/users/:id`, `handler-${i}-with-id`);
      }

      // Test matching
      const result = router.match('GET', '/api/v50/users/123');
      expect(result).toHaveLength(1);
      expect(result[0][0]).toBe('handler-50-with-id');
    });

    it('should handle deep nested routes efficiently', () => {
      router.add(
        'GET',
        '/api/v1/users/:id/posts/:postId/comments/:commentId/replies/:replyId',
        'get-reply'
      );

      const result = router.match(
        'GET',
        '/api/v1/users/123/posts/456/comments/789/replies/101'
      );
      expect(result).toHaveLength(1);
      expect(result[0][1]).toEqual({
        id: '123',
        postId: '456',
        commentId: '789',
        replyId: '101',
      });
    });

    it('should handle mixed static and parameter segments efficiently', () => {
      router.add('GET', '/api/users/:id/profile', 'get-profile');
      router.add('GET', '/api/users/:id/settings', 'get-settings');
      router.add('GET', '/api/users/:id/posts/:postId', 'get-post');
      router.add(
        'GET',
        '/api/users/:id/posts/:postId/comments',
        'get-comments'
      );

      const result = router.match('GET', '/api/users/123/posts/456/comments');
      expect(result).toHaveLength(1);
      expect(result[0][0]).toBe('get-comments');
      expect(result[0][1]).toEqual({ id: '123', postId: '456' });
    });
  });

  describe('RadixTree Tree Structure', () => {
    let router: RadixTreeRouter<string>;

    beforeEach(() => {
      router = new RadixTreeRouter();
    });

    it('should build correct tree structure for static routes', () => {
      router.add('GET', '/api/users', 'get-users');
      router.add('GET', '/api/posts', 'get-posts');
      router.add('GET', '/api/comments', 'get-comments');

      const result1 = router.match('GET', '/api/users');
      expect(result1).toHaveLength(1);
      expect(result1[0][0]).toBe('get-users');

      const result2 = router.match('GET', '/api/posts');
      expect(result2).toHaveLength(1);
      expect(result2[0][0]).toBe('get-posts');
    });

    it('should build correct tree structure for parameter routes', () => {
      router.add('GET', '/api/users/:id', 'get-user');
      router.add('GET', '/api/posts/:id', 'get-post');
      router.add('GET', '/api/comments/:id', 'get-comment');

      const result1 = router.match('GET', '/api/users/123');
      expect(result1).toHaveLength(1);
      expect(result1[0][1]).toEqual({ id: '123' });

      const result2 = router.match('GET', '/api/posts/456');
      expect(result2).toHaveLength(1);
      expect(result2[0][1]).toEqual({ id: '456' });
    });

    it('should build correct tree structure for mixed routes', () => {
      router.add('GET', '/api/users', 'get-users');
      router.add('GET', '/api/users/:id', 'get-user');
      router.add('GET', '/api/users/:id/posts', 'get-user-posts');
      router.add('GET', '/api/users/:id/posts/:postId', 'get-post');

      const result1 = router.match('GET', '/api/users');
      expect(result1).toHaveLength(1);
      expect(result1[0][0]).toBe('get-users');

      const result2 = router.match('GET', '/api/users/123');
      expect(result2).toHaveLength(1);
      expect(result2[0][1]).toEqual({ id: '123' });

      const result3 = router.match('GET', '/api/users/123/posts');
      expect(result3).toHaveLength(1);
      expect(result3[0][1]).toEqual({ id: '123' });

      const result = router.match('GET', '/api/users/123/posts/456');
      expect(result).toHaveLength(1);
      expect(result[0][0]).toBe('get-post');
      expect(result[0][1]).toEqual({
        id: '123',
        postId: '456',
      });
    });
  });
});
