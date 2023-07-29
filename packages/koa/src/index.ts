import type * as koa from "koa";
import type {
  RequestInit as NodeRequestInit,
  Response as NodeResponse,
} from "@web-widget/web-std";
import {
  installGlobals,
  AbortController as NodeAbortController,
  Headers as NodeHeaders,
  Request as NodeRequest,
  writeReadableStreamToWritable,
} from "@web-widget/web-std";

installGlobals();

export function createWebHeaders(
  requestHeaders: koa.Request["headers"]
): NodeHeaders {
  const headers = new NodeHeaders();

  for (const [key, values] of Object.entries(requestHeaders)) {
    if (values) {
      if (Array.isArray(values)) {
        for (const value of values) {
          headers.append(key, value);
        }
      } else {
        headers.set(key, values);
      }
    }
  }

  return headers;
}

export function createWebRequest(
  req: koa.Request,
  res: koa.Response
): NodeRequest {
  const url = new URL(`${req.protocol}://${req.get("host")}${req.url}`);

  // Abort action/loaders once we can no longer write a response
  const controller = new NodeAbortController();
  res.res.on("close", () => controller.abort());

  const init: NodeRequestInit = {
    method: req.method,
    headers: createWebHeaders(req.headers),
    // Cast until reason/throwIfAborted added
    // https://github.com/mysticatea/abort-controller/issues/36
    signal: controller.signal as NodeRequestInit["signal"],
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = req.req;
  }

  return new NodeRequest(url.href, init);
}

export async function sendWebResponse(
  res: koa.Response,
  webResponse: Response | NodeResponse
): Promise<void> {
  res.message = webResponse.statusText;
  res.status = webResponse.status;

  if (Reflect.has(webResponse.headers, "raw")) {
    const nodeResponse = webResponse as NodeResponse;
    for (const [key, values] of Object.entries(nodeResponse.headers.raw())) {
      for (const value of values) {
        res.append(key, value);
      }
    }
  } else {
    webResponse.headers.forEach((value, key) => {
      res.append(key, value);
    });
  }

  if (webResponse.body) {
    await writeReadableStreamToWritable(webResponse.body, res.res);
  } else {
    res.res.end();
  }
}
