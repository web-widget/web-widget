import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import type { RollupOutput } from "rollup";
import { join } from "pathe";
import { BuilderConfig } from "../types";

function getModule(output: RollupOutput, url: URL) {
  const file = fileURLToPath(url);
  const chunk = output.output.find(
    (chunk) => chunk.type === "chunk" && chunk.facadeModuleId === file
  );

  if (!chunk) {
    throw new Error(`Module not found`);
  }

  const module = "./" + chunk.fileName;
  return module;
}

const getType = (object: any) =>
  Object.prototype.toString.call(object).slice(8, -1).toLocaleLowerCase();

export async function entry(config: BuilderConfig, output: RollupOutput) {
  function valueToString(value: any) {
    const type = getType(value);
    switch (type) {
      case "string":
        return JSON.stringify(value);
      case "number":
      case "boolean":
      case "null":
        return String(value);
      case "url":
        return `await import(${JSON.stringify(
          getModule(output, value as URL)
        )})`;
    }
    throw new TypeError(`Unsupported value: ${value}`);
  }

  const manifest = [
    "export default {",
    Array.from(Object.entries(config.input))
      .map(
        ([key, value]) =>
          `  ${key}:` +
          (Array.isArray(value)
            ? [
                " [",
                value
                  .map((item) =>
                    [
                      "    {",
                      Array.from(Object.entries(item))
                        .map(
                          ([name, value]) =>
                            `      ${name}: ` + valueToString(value) + ","
                        )
                        .join("\n"),
                      "    },",
                    ].join("\n")
                  )
                  .join("\n"),
                "  ],",
              ].join("\n")
            : [
                " {",
                Array.from(Object.entries(value))
                  .map(
                    ([name, value]) =>
                      `    ${name}: ` + valueToString(value) + ","
                  )
                  .join("\n"),
                "  },",
              ].join("\n"))
      )
      .join("\n"),
    "};",
  ].join("\n");

  const expressMiddleware = `
import webServer from "@web-widget/web-server";
import { createWebRequest, sendWebResponse } from "@web-widget/express";
import manifest from "./manifest.js";

const router = webServer(manifest);

export default async (req, res, callback) => {
  const webRequest = createWebRequest(req, res);
  const webResponse = await router.handler(webRequest);

  await sendWebResponse(res, webResponse);
};`.trim();

  const koaMiddleware = `
import webServer from "@web-widget/web-server";
import { createWebRequest, sendWebResponse } from "@web-widget/koa";
import manifest from "./manifest.js";

const router = webServer(manifest);

export default async (ctx, next) => {
  const webRequest = createWebRequest(ctx.request, ctx.response);
  const webResponse = await router.handler(webRequest);

  await sendWebResponse(ctx.response, webResponse);
  await next();
};`.trim();

  await fs.writeFile(
    join(fileURLToPath(config.output.server), "manifest.js"),
    manifest
  );

  await fs.writeFile(
    join(fileURLToPath(config.output.server), "express-middleware.js"),
    expressMiddleware
  );

  await fs.writeFile(
    join(fileURLToPath(config.output.server), "koa-middleware.js"),
    koaMiddleware
  );
}
