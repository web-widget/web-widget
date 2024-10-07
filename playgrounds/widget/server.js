import fs from 'node:fs/promises';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Constants
const isProduction = process.env.NODE_ENV === 'production';
const port = process.env.PORT || 5173;
const base = process.env.BASE || '/';
const dist = `${__dirname}/dist`;

// Cached production assets manifest
const ssrManifest = isProduction
  ? await fs.readFile(`${dist}/client/.vite/manifest.json`, 'utf-8')
  : undefined;

// Create http server
const app = express();

// Add Vite or respective production middlewares
let vite;
if (!isProduction) {
  const { createServer } = await import('vite');
  vite = await createServer({
    configFile: `${__dirname}/vite.config.ts`,
    server: { middlewareMode: true },
    appType: 'custom',
    base,
  });
  app.use(vite.middlewares);
} else {
  const compression = (await import('compression')).default;
  const sirv = (await import('sirv')).default;
  app.use(compression());
  app.use(base, sirv(`${dist}/client`, { extensions: [] }));
}

// Index route
app.get('/', async (req, res) => {
  try {
    const url = req.originalUrl.replace(base, '');
    const name = 'index';

    let template;
    if (!isProduction) {
      // Always read fresh template in development
      template = await fs.readFile(`${__dirname}/${name}.html`, 'utf-8');
      template = await vite.transformIndexHtml(url, template);
    } else {
      template = await fs.readFile(`${dist}/client/${name}.html`, 'utf-8');
    }

    const html = template;
    res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
  } catch (e) {
    vite?.ssrFixStacktrace(e);
    console.log(e.stack);
    res.status(500).end(e.stack);
  }
});

// Serve HTML
app.get('*', async (req, res) => {
  try {
    const url = req.originalUrl.replace(base, '');
    const name = url.replace(/\//g, '');

    let template;
    let render;
    if (!isProduction) {
      const id = `/packages/${name}/entry-server.ts`;
      // Always read fresh template in development
      template = await fs.readFile(`${__dirname}/${name}.html`, 'utf-8');
      template = await vite.transformIndexHtml(url, template);
      render = (await vite.ssrLoadModule(id)).render;

      const rendered = await render(url, ssrManifest);

      const html = template
        .replace(`<!--app-head-->`, `${rendered.head ?? ''}`)
        .replace(`<!--app-html-->`, rendered.html ?? '');

      res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
    } else {
      template = await fs.readFile(`${dist}/client/${name}.html`, 'utf-8');
      render = (await import(`${dist}/server/${name}.js`)).render;

      const rendered = await render(url, ssrManifest);

      const html = template
        .replace(`<!--app-head-->`, rendered.head ?? '')
        .replace(`<!--app-html-->`, rendered.html ?? '');

      res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
    }
  } catch (e) {
    vite?.ssrFixStacktrace(e);
    console.log(e.stack);
    res.status(500).end(e.stack);
  }
});

// Start http server
app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);
});
