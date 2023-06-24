import type * as express from "express";
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
  requestHeaders: express.Request["headers"]
): NodeHeaders {
  let headers = new NodeHeaders();

  for (let [key, values] of Object.entries(requestHeaders)) {
    if (values) {
      if (Array.isArray(values)) {
        for (let value of values) {
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
  req: express.Request,
  res: express.Response
): NodeRequest {
  let url = new URL(`${req.protocol}://${req.get("host")}${req.url}`);

  // Abort action/loaders once we can no longer write a response
  let controller = new NodeAbortController();
  res.on("close", () => controller.abort());

  let init: NodeRequestInit = {
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
  res: express.Response,
  nodeResponse: NodeResponse
): Promise<void> {
  res.statusMessage = nodeResponse.statusText;
  res.status(nodeResponse.status);

  for (let [key, values] of Object.entries(nodeResponse.headers.raw())) {
    for (let value of values) {
      res.append(key, value);
    }
  }

  if (nodeResponse.body) {
    await writeReadableStreamToWritable(nodeResponse.body, res);
  } else {
    res.end();
  }
}
