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
    "generate manifest",
    async () => await entry(builderConfig, serverResult)
  );

  // TODO
  // const styles = clientResult
  //   .filter(
  //     (chunk) => chunk.type === "asset" && chunk.fileName.endsWith(".css")
  //   )
  //   .map(
  //     (chunk) =>
  //       `<link rel="stylesheet" href="${builderConfig.base}${chunk.fileName}">`
  //   )
  //   .join("\n");

  // console.log(styles);
  // console.log(clientResult);
  // console.log(widgets);

  // const input = new Map();

  // clientResult.output
  //   .filter(({ isEntry }) => isEntry)
  //   .forEach(({ fileName, facadeModuleId }) => {
  //     input.set(facadeModuleId, fileName);
  //   });

  // await withSpinner(
  //   "building widgets bundle",
  //   async () => await bundleWidgets(builderConfig, widgets)
  // );

  // await withSpinner(
  //   "writing routes",
  //   async () => await writeRoutes(builderConfig, input, widgets)
  // );

  //rm(builderConfig.tempDir);

  console.info(
    `build complete in ${((Date.now() - start) / 1000).toFixed(2)}s.`
  );
}
