const ROUTER_TYPES = ['url-pattern', 'radix-tree'];

function expected(count, handler, params, handlers) {
  return { count, handler, params, handlers };
}

function request(path, expectation, method = 'GET') {
  return { method, path, expected: expectation };
}

function scenario(options) {
  return {
    routerTypes: ROUTER_TYPES,
    ...options,
  };
}

function createBaselineCases() {
  const routes = [
    ['/', 0],
    ['/hello', 1],
    ['/about', 2],
    ['/contact', 3],
    ['/users/:id', 4],
    ['/posts/:slug', 5],
    ['/files/:name', 6],
    ['/users/:id/posts/:postId', 7],
    ['/api/:version/users/:id', 8],
    ['/blog/:year/:month/:slug', 9],
  ];
  const requests = [
    request('/', expected(1, 0)),
    request('/hello', expected(1, 1)),
    request('/about', expected(1, 2)),
    request('/contact', expected(1, 3)),
    request('/users/123', expected(1, 4, { id: '123' })),
    request('/posts/my-post', expected(1, 5, { slug: 'my-post' })),
    request('/files/document.pdf', expected(1, 6, { name: 'document.pdf' })),
    request(
      '/users/123/posts/456',
      expected(1, 7, { id: '123', postId: '456' })
    ),
    request('/api/v1/users/789', expected(1, 8, { version: 'v1', id: '789' })),
    request(
      '/blog/2024/03/my-post',
      expected(1, 9, { year: '2024', month: '03', slug: 'my-post' })
    ),
  ];

  return [
    scenario({
      id: 'baseline/current-mix',
      suite: 'baseline',
      name: 'current HTTP benchmark route mix',
      routeCount: routes.length,
      register(router) {
        for (const [path, handler] of routes) {
          router.add('GET', path, handler);
        }
      },
      requests,
    }),
    scenario({
      id: 'baseline/encoded-param',
      suite: 'baseline',
      name: 'encoded parameter',
      routeCount: 1,
      register(router) {
        router.add('GET', '/users/:name', 0);
      },
      requests: [
        request('/users/john%20doe', expected(1, 0, { name: 'john doe' })),
      ],
    }),
    scenario({
      id: 'baseline/dot-normalization',
      suite: 'baseline',
      name: 'URLPattern dot-segment normalization',
      routeCount: 1,
      routerTypes: ['url-pattern'],
      register(router) {
        router.add('GET', '/a/../item', 0);
      },
      requests: [request('/a/%2e%2e/item', expected(1, 0))],
    }),
  ];
}

function createStaticScaleCases(routeCounts) {
  return routeCounts.map((routeCount) =>
    scenario({
      id: `scale-static/${routeCount}`,
      suite: 'scale-static',
      name: `${routeCount} static routes, last hit`,
      routeCount,
      register(router) {
        for (let index = 0; index < routeCount; index++) {
          router.add('GET', `/static/route-${index}`, index);
        }
      },
      requests: [
        request(`/static/route-${routeCount - 1}`, expected(1, routeCount - 1)),
      ],
    })
  );
}

function createSharedPrefixScaleCases(routeCounts) {
  return routeCounts.map((routeCount) =>
    scenario({
      id: `scale-shared/${routeCount}`,
      suite: 'scale-shared',
      name: `${routeCount} dynamic routes sharing /api`,
      routeCount,
      register(router) {
        for (let index = 0; index < routeCount; index++) {
          router.add('GET', `/api/resource-${index}/:id`, index);
        }
      },
      requests: [
        request(
          `/api/resource-${routeCount - 1}/123`,
          expected(1, routeCount - 1, { id: '123' })
        ),
      ],
    })
  );
}

function createDistributedPrefixCase(routeCount) {
  return scenario({
    id: `scale-distributed/${routeCount}`,
    suite: 'scale-distributed',
    name: `${routeCount} dynamic routes with distinct first segments`,
    routeCount,
    register(router) {
      for (let index = 0; index < routeCount; index++) {
        router.add('GET', `/resource-${index}/item/:id`, index);
      }
    },
    requests: [
      request(
        `/resource-${routeCount - 1}/item/123`,
        expected(1, routeCount - 1, { id: '123' })
      ),
    ],
  });
}

function createHitPositionCases(routeCount) {
  const createCase = (position, routeIndex, expectation) =>
    scenario({
      id: `hit-position/${position}`,
      suite: 'hit-position',
      name: `${routeCount} shared-prefix routes, ${position}`,
      routeCount,
      register(router) {
        for (let index = 0; index < routeCount; index++) {
          router.add('GET', `/api/resource-${index}/:id`, index);
        }
      },
      requests: [
        request(`/api/resource-${routeIndex}/123`, expectation(routeIndex)),
      ],
    });

  const hit = (routeIndex) =>
    expected(1, routeIndex, {
      id: '123',
    });

  return [
    createCase('first hit', 0, hit),
    createCase('middle hit', Math.floor(routeCount / 2), hit),
    createCase('last hit', routeCount - 1, hit),
    createCase('miss', routeCount, () => expected(0)),
  ];
}

function createSkewedDistributionCase(routeCount) {
  const first = request('/api/resource-0/123', expected(1, 0, { id: '123' }));
  const middleIndex = Math.floor(routeCount / 2);
  const middle = request(
    `/api/resource-${middleIndex}/123`,
    expected(1, middleIndex, { id: '123' })
  );
  const last = request(
    `/api/resource-${routeCount - 1}/123`,
    expected(1, routeCount - 1, { id: '123' })
  );
  const requests = [];
  for (let index = 0; index < 16; index++) requests.push(first);
  for (let index = 0; index < 3; index++) requests.push(middle);
  requests.push(last);

  return scenario({
    id: `distribution/80-15-5-${routeCount}`,
    suite: 'distribution',
    name: `${routeCount} shared-prefix routes, 80/15/5 traffic`,
    routeCount,
    register(router) {
      for (let index = 0; index < routeCount; index++) {
        router.add('GET', `/api/resource-${index}/:id`, index);
      }
    },
    requests,
  });
}

function createMethodCase(routeCount) {
  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
  const routeIndex = routeCount - 1;
  const method = methods[routeIndex % methods.length];

  return scenario({
    id: `method-selectivity/${routeCount}`,
    suite: 'method-selectivity',
    name: `${routeCount} shared-prefix routes across five methods`,
    routeCount,
    register(router) {
      for (let index = 0; index < routeCount; index++) {
        router.add(
          methods[index % methods.length],
          `/api/resource-${index}/:id`,
          index
        );
      }
    },
    requests: [
      request(
        `/api/resource-${routeIndex}/123`,
        expected(1, routeIndex, { id: '123' }),
        method
      ),
    ],
  });
}

function createWildcardCase(routeCount) {
  return scenario({
    id: `wildcard/${routeCount}`,
    suite: 'wildcard',
    name: `${routeCount} terminal wildcard routes sharing /api`,
    routeCount,
    register(router) {
      for (let index = 0; index < routeCount; index++) {
        router.add('GET', `/api/resource-${index}/*`, index);
      }
    },
    requests: [
      request(
        `/api/resource-${routeCount - 1}/a/b/c`,
        expected(1, routeCount - 1)
      ),
    ],
  });
}

function createOverlapCase(routeCount) {
  const handlers = Array.from({ length: routeCount }, (_, index) => index);
  return scenario({
    id: `overlap/${routeCount}`,
    suite: 'overlap',
    name: `${routeCount} parameter routes matching one pathname`,
    routeCount,
    register(router) {
      for (let index = 0; index < routeCount; index++) {
        router.add('GET', `/api/:value${index}`, index);
      }
    },
    requests: [
      request(
        '/api/token',
        expected(routeCount, 0, { value0: 'token' }, handlers)
      ),
    ],
  });
}

function createComplexPatternCases(routeCounts) {
  return routeCounts
    .filter((routeCount) => routeCount <= 1000)
    .map((routeCount) =>
      scenario({
        id: `complex-urlpattern/${routeCount}`,
        suite: 'complex-urlpattern',
        name: `${routeCount} regex routes sharing /api`,
        routeCount,
        routerTypes: ['url-pattern'],
        register(router) {
          for (let index = 0; index < routeCount; index++) {
            router.add('GET', `/api/resource-${index}/:id([0-9]+)`, index);
          }
        },
        requests: [
          request(
            `/api/resource-${routeCount - 1}/123`,
            expected(1, routeCount - 1, { id: '123' })
          ),
        ],
      })
    );
}

export function createRouterBenchmarkCases(config) {
  const routeCounts = config['route-counts'];
  const stressRouteCount = config['stress-route-count'];
  const overlapRouteCount = config['overlap-route-count'];

  return [
    ...createBaselineCases(),
    ...createStaticScaleCases(routeCounts),
    ...createSharedPrefixScaleCases(routeCounts),
    createDistributedPrefixCase(stressRouteCount),
    ...createHitPositionCases(stressRouteCount),
    createSkewedDistributionCase(stressRouteCount),
    createMethodCase(stressRouteCount),
    createWildcardCase(stressRouteCount),
    createOverlapCase(overlapRouteCount),
    ...createComplexPatternCases(routeCounts),
  ];
}
