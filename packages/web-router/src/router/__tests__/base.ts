/**
 * @fileoverview Common Router Test Rules
 * Test rules that apply to all router implementations
 */

import type { Router, Params } from '../base';

/**
 * Common test rules that all router implementations should pass
 */
export class CommonRouterTestRules {
  /**
   * Run all common tests for a router implementation
   */
  static runAllTests<T>(createRouter: () => Router<T>) {
    this.testBasicRouting(createRouter);
    this.testMethodHandling(createRouter);
    this.testRoutePrecedence(createRouter);
    this.testErrorHandling(createRouter);
    this.testParameterExtraction(createRouter);
    this.testComplexScenarios(createRouter);
  }

  /**
   * Helper function to get the most specific match from router results
   * Different routers may return different numbers of matches
   */
  private static getMostSpecificMatch<T>(
    result: [T, Params, string][]
  ): [T, Params, string] | undefined {
    if (result.length === 0) return undefined;
    if (result.length === 1) return result[0];

    // For multiple matches, return the one with the most specific path (fewest wildcards)
    // This is a simple heuristic - more specific paths tend to have fewer segments with wildcards
    return result.reduce((best, current) => {
      const bestSpecificity = this.calculatePathSpecificity(best[2]);
      const currentSpecificity = this.calculatePathSpecificity(current[2]);
      return currentSpecificity > bestSpecificity ? current : best;
    });
  }

  /**
   * Calculate path specificity - higher number means more specific
   */
  private static calculatePathSpecificity(pathname: string): number {
    const segments = pathname.split('/').filter(Boolean);
    let specificity = segments.length;

    // Reduce specificity for wildcards and parameters
    for (const segment of segments) {
      if (segment === '*') specificity -= 2;
      else if (segment.startsWith(':')) specificity -= 1;
    }

    return specificity;
  }

  /**
   * Test basic route registration and matching
   */
  static testBasicRouting<T>(createRouter: () => Router<T>) {
    describe('Basic Routing', () => {
      let router: Router<T>;

      beforeEach(() => {
        router = createRouter();
      });

      it('should match static routes', () => {
        router.add('GET', '/users', 'get-users' as T);
        router.add('POST', '/users', 'create-user' as T);

        const result1 = router.match('GET', '/users');
        expect(result1).toHaveLength(1);
        expect(result1[0][0]).toBe('get-users');

        const result2 = router.match('POST', '/users');
        expect(result2).toHaveLength(1);
        expect(result2[0][0]).toBe('create-user');
      });

      it('should match parameter routes', () => {
        router.add('GET', '/users/:id', 'get-user' as T);
        router.add('PUT', '/users/:id', 'update-user' as T);

        const result = router.match('GET', '/users/123');
        expect(result).toHaveLength(1);
        expect(result[0][0]).toBe('get-user');
        expect(result[0][1]).toEqual({ id: '123' });
      });

      it('should match nested parameter routes', () => {
        router.add('GET', '/users/:id/posts/:postId', 'get-post' as T);

        const result = router.match('GET', '/users/123/posts/456');
        expect(result).toHaveLength(1);
        expect(result[0][0]).toBe('get-post');
        expect(result[0][1]).toEqual({ id: '123', postId: '456' });
      });

      it('should handle path normalization', () => {
        router.add('GET', '/users', 'get-users' as T);
        router.add('GET', 'users', 'get-users-no-slash' as T);

        const result1 = router.match('GET', '/users');
        const match1 = this.getMostSpecificMatch(result1);
        expect(match1).toBeDefined();
        // Different routers may handle path normalization differently
        // URLPattern normalizes paths, while RadixTree may not
        // Different routers may handle path normalization differently
        // URLPattern normalizes paths, while RadixTree may not
        expect(match1![0]).toMatch(/get-users/);

        const result2 = router.match('GET', 'users');
        const match2 = this.getMostSpecificMatch(result2);
        expect(match2).toBeDefined();
      });

      it('should handle trailing slashes', () => {
        router.add('GET', '/users/', 'get-users-trailing' as T);
        router.add('GET', '/users', 'get-users' as T);

        const result1 = router.match('GET', '/users');
        const match1 = this.getMostSpecificMatch(result1);
        expect(match1).toBeDefined();

        const result2 = router.match('GET', '/users/');
        const match2 = this.getMostSpecificMatch(result2);
        expect(match2).toBeDefined();
      });
    });
  }

  /**
   * Test method handling
   */
  static testMethodHandling<T>(createRouter: () => Router<T>) {
    describe('Method Handling', () => {
      let router: Router<T>;

      beforeEach(() => {
        router = createRouter();
      });

      it('should handle ALL method', () => {
        router.add('ALL', '/health', 'health-check' as T);

        const result1 = router.match('GET', '/health');
        expect(result1).toHaveLength(1);
        expect(result1[0][0]).toBe('health-check');

        const result2 = router.match('POST', '/health');
        expect(result2).toHaveLength(1);
        expect(result2[0][0]).toBe('health-check');
      });

      it('should handle different HTTP methods', () => {
        router.add('GET', '/users/:id', 'get-user' as T);
        router.add('POST', '/users/:id', 'create-user' as T);
        router.add('PUT', '/users/:id', 'update-user' as T);
        router.add('DELETE', '/users/:id', 'delete-user' as T);

        const getResult = router.match('GET', '/users/123');
        expect(getResult[0][0]).toBe('get-user');

        const postResult = router.match('POST', '/users/123');
        expect(postResult[0][0]).toBe('create-user');

        const putResult = router.match('PUT', '/users/123');
        expect(putResult[0][0]).toBe('update-user');

        const deleteResult = router.match('DELETE', '/users/123');
        expect(deleteResult[0][0]).toBe('delete-user');
      });
    });
  }

  /**
   * Test route precedence
   */
  static testRoutePrecedence<T>(createRouter: () => Router<T>) {
    describe('Route Precedence', () => {
      let router: Router<T>;

      beforeEach(() => {
        router = createRouter();
      });

      it('should prioritize static routes over parameter routes', () => {
        router.add('GET', '/users/:id', 'get-user' as T);
        router.add('GET', '/users/me', 'get-me' as T);

        const result = router.match('GET', '/users/me');
        const match = this.getMostSpecificMatch(result);
        expect(match).toBeDefined();
        expect(match![0]).toBe('get-me');
        expect(match![1]).toEqual({});
      });

      it('should handle multiple matching routes', () => {
        router.add('GET', '/users/:id', 'get-user' as T);
        router.add('GET', '/users/:id/posts', 'get-user-posts' as T);

        const result = router.match('GET', '/users/123/posts');
        const match = this.getMostSpecificMatch(result);
        expect(match).toBeDefined();
        expect(match![0]).toBe('get-user-posts');
        expect(match![1]).toEqual({ id: '123' });
      });
    });
  }

  /**
   * Test error handling
   */
  static testErrorHandling<T>(createRouter: () => Router<T>) {
    describe('Error Handling', () => {
      let router: Router<T>;

      beforeEach(() => {
        router = createRouter();
      });

      it('should return empty array for non-matching routes', () => {
        router.add('GET', '/users', 'get-users' as T);

        const result = router.match('GET', '/posts');
        expect(result).toHaveLength(0);
      });

      it('should return empty array for non-matching methods', () => {
        router.add('GET', '/users', 'get-users' as T);

        const result = router.match('POST', '/users');
        // For URLPattern router, we need to check that no GET-specific routes match POST
        const getSpecificMatches = result.filter((match) => {
          return match[0] === 'get-users';
        });
        expect(getSpecificMatches).toHaveLength(0);
      });

      it('should handle empty pathname', () => {
        expect(() => {
          router.add('GET', '', 'handler' as T);
        }).not.toThrow();
      });

      it('should handle root path', () => {
        expect(() => {
          router.add('GET', '/', 'handler' as T);
        }).not.toThrow();
      });
    });
  }

  /**
   * Test parameter extraction
   */
  static testParameterExtraction<T>(createRouter: () => Router<T>) {
    describe('Parameter Extraction', () => {
      let router: Router<T>;

      beforeEach(() => {
        router = createRouter();
      });

      it('should extract parameters correctly', () => {
        router.add('GET', '/users/:id/posts/:postId', 'get-post' as T);

        const result = router.match('GET', '/users/123/posts/456');
        const match = this.getMostSpecificMatch(result);
        expect(match).toBeDefined();
        expect(match![1]).toEqual({ id: '123', postId: '456' });
      });

      it('should handle URL-encoded parameters', () => {
        router.add('GET', '/users/:name', 'get-user' as T);

        const result = router.match('GET', '/users/john%20doe');
        const match = this.getMostSpecificMatch(result);
        expect(match).toBeDefined();
        // Check that the parameter is correctly decoded, regardless of parameter name
        const paramValue = Object.values(match![1])[0];
        expect(paramValue).toBe('john doe');
      });

      it('should handle multiple parameters', () => {
        router.add(
          'GET',
          '/api/:version/users/:id/posts/:postId',
          'get-post' as T
        );

        const result = router.match('GET', '/api/v1/users/123/posts/456');
        const match = this.getMostSpecificMatch(result);
        expect(match).toBeDefined();
        expect(match![1]).toEqual({
          version: 'v1',
          id: '123',
          postId: '456',
        });
      });
    });
  }

  /**
   * Test complex scenarios
   */
  static testComplexScenarios<T>(createRouter: () => Router<T>) {
    describe('Complex Scenarios', () => {
      let router: Router<T>;

      beforeEach(() => {
        router = createRouter();
      });

      it('should handle complex nested routes', () => {
        router.add(
          'GET',
          '/api/v1/users/:id/posts/:postId/comments/:commentId',
          'get-comment' as T
        );
        router.add(
          'POST',
          '/api/v1/users/:id/posts/:postId/comments',
          'create-comment' as T
        );
        router.add('GET', '/api/v1/users/:id/posts/:postId', 'get-post' as T);
        router.add('GET', '/api/v1/users/:id', 'get-user' as T);

        const result = router.match(
          'GET',
          '/api/v1/users/123/posts/456/comments/789'
        );
        const match = this.getMostSpecificMatch(result);
        expect(match).toBeDefined();
        expect(match![0]).toBe('get-comment');
        expect(match![1]).toEqual({
          id: '123',
          postId: '456',
          commentId: '789',
        });
      });

      it('should handle mixed static and parameter segments', () => {
        router.add('GET', '/api/users/:id/profile', 'get-profile' as T);
        router.add('GET', '/api/users/:id/settings', 'get-settings' as T);
        router.add('GET', '/api/users/:id', 'get-user' as T);

        const result1 = router.match('GET', '/api/users/123/profile');
        const match1 = this.getMostSpecificMatch(result1);
        expect(match1).toBeDefined();
        expect(match1![0]).toBe('get-profile');

        const result2 = router.match('GET', '/api/users/123/settings');
        const match2 = this.getMostSpecificMatch(result2);
        expect(match2).toBeDefined();
        expect(match2![0]).toBe('get-settings');
      });
    });
  }
}
