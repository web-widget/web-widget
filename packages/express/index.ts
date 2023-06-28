import type * as express from "express";
import type {
  ServerResponse,
  IncomingMessage,
  IncomingHttpHeaders,
} from "node:http";
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
  requestHeaders: express.Request["headers"] | IncomingHttpHeaders
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

function getProtocol(req: express.Request | IncomingMessage) {
  if (Reflect.has(req, "protocol")) {
    return (req as express.Request).protocol;
  }

  // @see https://github.com/koajs/koa/blob/dbf4b8f41286befd53dfd802740f2021441435bf/lib/request.js#L402
  // @ts-ignore
  if (req.socket.encrypted) return "https";
  // if (!req.app.proxy) return "http";
  const proto = req.headers["X-Forwarded-Proto"];
  return typeof proto === "string" ? proto.split(/\s*,\s*/, 1)[0] : "http";
}

export function createWebRequest(
  req: express.Request | IncomingMessage,
  res: express.Response | ServerResponse
): NodeRequest {
  const url = new URL(`${getProtocol(req)}://${req.headers.host}${req.url}`);

  // Abort action/loaders once we can no longer write a response
  const controller = new NodeAbortController();
  res.on("close", () => controller.abort());

  const init: NodeRequestInit = {
    method: req.method,
    headers: createWebHeaders(req.headers),
    // Cast until reason/throwIfAborted added
    // https://github.com/mysticatea/abort-controller/issues/36
    signal: controller.signal as NodeRequestInit["signal"],
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = req;
  }

  return new NodeRequest(url.href, init);
}

export async function sendWebResponse(
  res: express.Response | ServerResponse,
  nodeResponse: NodeResponse
): Promise<void> {
  res.statusMessage = nodeResponse.statusText;
  res.statusCode = nodeResponse.status;

  nodeResponse.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  if (nodeResponse.body) {
    await writeReadableStreamToWritable(nodeResponse.body, res);
  } else {
    res.end();
  }
}
