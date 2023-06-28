import type { ModuleLoader } from "../loader/index";
import { getStylesForURL } from "./css";
import { viteID } from "./util";

export interface SSRElement {
  props: Record<string, any>;
  children: string;
}

export async function getAssets(
  filePath: URL,
  loader: ModuleLoader,
  root: URL,
  mode: string
) {
  // Add hoisted script tags
  const scripts = new Set<SSRElement>();

  // Pass framework CSS in as style tags to be appended to the page.
  const { urls: styleUrls, stylesMap } = await getStylesForURL(
    filePath,
    loader,
    mode
  );
  let links = new Set<SSRElement>();
  [...styleUrls].forEach((href) => {
    links.add({
      props: {
        rel: "stylesheet",
        href,
      },
      children: "",
    });
  });

  let styles = new Set<SSRElement>();
  [...stylesMap].forEach(([url, content]) => {
    // Vite handles HMR for styles injected as scripts
    scripts.add({
      props: {
        type: "module",
        src: url,
      },
      children: "",
    });
    // But we still want to inject the styles to avoid FOUC
    styles.add({
      props: {
        type: "text/css",
        // Track the ID so we can match it to Vite's injected style later
        "data-vite-dev-id": viteID(new URL(`.${url}`, root)),
      },
      children: content,
    });
  });

  return { scripts, styles, links };
}
