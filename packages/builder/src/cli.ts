import pc from "picocolors";
import minimist from "minimist";

const argv: any = minimist(process.argv.slice(2));

const command: string = argv._[0];
const root: string = argv._[command ? 1 : 0];
if (root) argv.root = root;

executeCommand(!command || command === "dev" ? "serve" : command).catch(
  (error) => {
    throw error;
  }
);

async function executeCommand(command: string) {
  if (command === "serve") {
    const { createServer } = await import("./server");
    createServer(root, argv)
      .then(async ({ viteServer }) => {
        await viteServer.listen();
        const {
          config: { logger },
        } = viteServer;
        logger.info(pc.green(" dev server running at:\n"), {
          clear: !logger.hasWarned,
        });
        viteServer.printUrls();
      })
      .catch((err: any) => {
        console.error(pc.red("error starting server:\n"), err);
        process.exit(1);
      });
  } else if (command === "build") {
    throw new Error("Not yet supported");
  } else if (command === "preview") {
    throw new Error("Not yet supported");
  } else {
    console.error(pc.red(`unknown command "${command}".`));
    process.exit(1);
  }
}
