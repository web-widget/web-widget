import {
  Blob as NodeBlob,
  File as NodeFile,
  FormData as NodeFormData,
  Headers as NodeHeaders,
  Request as NodeRequest,
  Response as NodeResponse,
  fetch as nodeFetch,
} from "./fetch";
import {
  ReadableStream as NodeReadableStream,
  WritableStream as NodeWritableStream,
} from "@remix-run/web-stream";
import { atob, btoa } from "./base64";

import { AbortController as NodeAbortController } from "abort-controller";
import { URLPattern as NodeURLPattern } from "@netlify/urlpattern-polyfill";
import crypto from "node:crypto";

export function installGlobals() {
  global.atob = atob;
  global.btoa = btoa;

  global.Blob = NodeBlob;
  global.File = NodeFile;

  global.Headers = NodeHeaders as any as typeof Headers;
  global.Request = NodeRequest as any as typeof Request;
  global.Response = NodeResponse as unknown as typeof Response;
  global.fetch = nodeFetch as typeof fetch;
  global.FormData = NodeFormData;

  global.ReadableStream = NodeReadableStream;
  global.WritableStream = NodeWritableStream;

  global.AbortController = global.AbortController || NodeAbortController;

  // @ts-ignore
  global.URLPattern = global.URLPattern || NodeURLPattern;

  // @ts-ignore
  global.crypto = crypto;
}
