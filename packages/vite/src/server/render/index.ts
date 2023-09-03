import type {
  LinkDescriptor,
  ScriptDescriptor,
  StyleDescriptor,
} from "@web-widget/schema";
import type { ModuleLoader } from "../loader/index";
import { getStylesForURL } from "./css";
import { viteID } from "./util";

export async function getMeta(
  filePath: URL,
  loader: ModuleLoader,
  root: URL,
  mode: string
): Promise<{
  link: LinkDescriptor[];
  style: StyleDescriptor[];
  script: ScriptDescriptor[];
}> {
  // Add hoisted script tags
  const script: ScriptDescriptor[] = [];

  // Pass framework CSS in as style tags to be appended to the page.
  const { urls: styleUrls, stylesMap } = await getStylesForURL(
    filePath,
    loader,
    mode
  );
  let link: LinkDescriptor[] = [...styleUrls].map((href) => ({
    rel: "stylesheet",
    href,
  }));

  let style: StyleDescriptor[] = [...stylesMap].map(([url, content]) => {
    // Vite handles HMR for styles injected as scripts
    script.push({
      type: "module",
      src: url,
    });
    // But we still want to inject the styles to avoid FOUC
    return {
      // Track the ID so we can match it to Vite's injected style later
      // @ts-ignore
      "data-vite-dev-id": viteID(new URL(`.${url}`, root)),
      content,
    };
  });

  return { script, style, link };
}
