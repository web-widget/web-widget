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

export async function generateManifest(
  config: BuilderConfig,
  output: RollupOutput
) {
  let code = "export const manifest = {\n";
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
  for (const [key, value] of Object.entries(config.input)) {
    code += `  ${key}:`;
    if (Array.isArray(value)) {
      code += " [\n";
      code += value
        .map(
          (item) =>
            `    {\n` +
            Array.from(Object.entries(item))
              .map(([name, value]) => `      ${name}: ` + valueToString(value))
              .join(",\n") +
            `\n    },`
        )
        .join("\n");
      code += "\n  ],\n";
    } else {
      code +=
        ` {\n` +
        Array.from(Object.entries(value))
          .map(([name, value]) => `    ${name}: ` + valueToString(value))
          .join(",\n") +
        `\n  },\n`;
    }
  }

  code += "};\n";

  await fs.writeFile(
    join(fileURLToPath(config.output.server), "manifest.js"),
    code
  );

  return code;
}
