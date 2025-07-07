import { defineMiddlewareHandler } from '@web-widget/helpers';
import { ResponseCookies, RequestCookies } from '@web-widget/helpers/headers';
import { redirect } from '@web-widget/helpers/navigation';
import { createVisitorId, marketingFlags } from '#config/precomputed-flags';
import { precompute } from '@web-widget/helpers/flags';

// Header name for the precomputed flags code
const FLAGS_CODE_HEADER = 'x-flags-code';

export const handler = defineMiddlewareHandler(async (ctx, next) => {
  const { request } = ctx;
  const url = new URL(request.url);

  // Check if we need to reset the visitor ID
  const shouldReset = url.searchParams.has('resetVisitorId');

  // Get visitor ID from cookies using the framework helper
  const cookieStore = new RequestCookies(request.headers);
  let visitorId = cookieStore.get('visitorId')?.value || null;

  // If no visitor ID or reset is requested, create a new one
  if (!visitorId || shouldReset) {
    visitorId = createVisitorId();
  }

  // Always ensure visitor ID is available in headers for flag evaluation
  // This header is used by the flags during precomputation
  request.headers.set('x-visitorId', visitorId);

  // If reset was requested, redirect to clean URL without parameter
  if (shouldReset) {
    const response = redirect('/flags/marketing-pages');
    const responseCookies = new ResponseCookies(response.headers);
    responseCookies.set('visitorId', visitorId, {
      path: '/',
      httpOnly: true,
    });

    return response;
  }

  // Use the flags/web-router precompute function to calculate the flags code
  // This efficiently computes a hash representing the current flag combination
  // for this specific visitor, enabling caching and performance optimization
  const flagsCode = await precompute(marketingFlags);
  request.headers.set(FLAGS_CODE_HEADER, flagsCode);

  // Continue to the route handler
  const response = await next();

  // Set the Vary header to enable intelligent caching based on flags code
  // This tells caches to store separate versions for different flag combinations
  // Users with the same flagsCode will get cached responses, improving performance
  response.headers.append('vary', FLAGS_CODE_HEADER);

  // Set the visitor ID cookie if it wasn't already set
  if (!cookieStore.has('visitorId')) {
    const responseCookies = new ResponseCookies(response.headers);
    responseCookies.set('visitorId', visitorId, {
      path: '/',
      httpOnly: true,
    });
  }

  return response;
});
