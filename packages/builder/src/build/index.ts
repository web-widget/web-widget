import { openConfig } from "../config";
import { bundle } from "./bundle";
import { withSpinner, rm } from "./utils";
import { entry } from "./entry";

export async function build(root: string) {
  const start = Date.now();

  process.env.NODE_ENV = "production";
  const { builderConfig } = await openConfig({
    cwd: process.cwd(),
    cmd: "build",
    // mode: 'production'
  });

  const { clientResult, serverResult } = await withSpinner(
    "building client + server bundles",
    async () => await bundle(builderConfig)
  );

  await withSpinner(
    "generate web-server manifest",
    async () => await entry(builderConfig, serverResult)
  );

  console.info(
    `build complete in ${((Date.now() - start) / 1000).toFixed(2)}s.`
  );
}
