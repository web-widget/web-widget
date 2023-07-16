// @ts-expect-error
import userManifest from "virtual:@web-widget/server:user-manifest";

import type { Manifest, Router } from "@web-widget/web-server";
import webServer from "@web-widget/web-server";
import { createWebRequest, sendWebResponse } from "@web-widget/express";
import { IncomingMessage, ServerResponse } from "node:http";

async function resolveManifest(
  object: { module: string }[] | { module: string }
) {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(object)) {
    if (Array.isArray(value)) {
      result[key] = await Promise.all(
        value.map(({ module: file, ...value }) =>
          import(/* @vite-ignore */ file).then((module) => ({
            ...value,
            module,
          }))
        )
      );
    } else {
      result[key] = await import(/* @vite-ignore */ value.module).then(
        (module) => ({
          ...value,
          module,
        })
      );
    }
  }

  return result as Manifest;
}

let router: Router;
const manifest = resolveManifest(userManifest);

export const middleware = async (
  req: IncomingMessage,
  res: ServerResponse,
  callback: (...args: unknown[]) => void
) => {
  if (!router) {
    router = webServer(await manifest);
  }

  const webRequest = createWebRequest(req, res);
  const webResponse = await router.handler(webRequest);

  // TODO
  // @ts-ignore
  await sendWebResponse(res, webResponse);
};
