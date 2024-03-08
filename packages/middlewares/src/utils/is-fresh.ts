import { fresh } from '@web-widget/helpers/headers';
export function isFresh(req: Request, res: Response) {
  const method = req.method;

  // GET or HEAD for weak freshness validation only
  if (method !== 'GET' && method !== 'HEAD') return false;

  const status = res.status;
  // 2xx or 304 as per rfc2616 14.26
  if ((status >= 200 && status < 300) || status === 304) {
    return fresh(req.headers, res.headers);
  }

  return false;
}
