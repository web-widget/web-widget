import type { Loader } from "../types";
const ASSET_PLACEHOLDER = "asset://";
const MODULE_REG =
  /\b(?:import|__vite_ssr_dynamic_import__)\(["']([^"']*)["']\)/;

export function parseModuleId(loader: Loader) {
  const match = String(loader).match(MODULE_REG);
  const id = match?.[1];
  if (!id) {
    throw new Error(`The url for the module was not found: ${loader}`);
  }
  return id;
}

export function unsafePropsToAttrs(props: any) {
  return Object.entries(props).reduce(
    (attrs, [key, value]) => {
      if (typeof value === "string") {
        attrs[key.toLowerCase()] = value;
      } else if (typeof value === "number") {
        attrs[key.toLowerCase()] = String(value);
      } else if (value === true) {
        attrs[key.toLowerCase()] = "";
      }
      return attrs;
    },
    {} as Record<string, string>
  );
}

export function getClientModuleId(
  loader: Loader,
  options: {
    import?: string;
    base?: string;
  }
) {
  return options.import && !options.import.startsWith(ASSET_PLACEHOLDER)
    ? options.import
    : options.base && !options.base.startsWith("file://")
    ? options.base + parseModuleId(loader)
    : parseModuleId(loader);
}

export function getDisplayModuleId(
  loader: Loader,
  options: {
    base?: string;
  }
) {
  return options.base?.startsWith("file://")
    ? new URL(parseModuleId(loader), options.base).href
    : parseModuleId(loader);
}
