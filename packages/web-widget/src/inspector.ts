// This utility is based on https://github.com/BuilderIO/qwik/
// License: https://github.com/BuilderIO/qwik/blob/5f1c80372dc95b7d1de4b909baed3c08d5eeac2c/LICENSE

function findContainer(el: HTMLElement | null): HTMLElement | null {
  return el?.closest("web-widget[import]") as HTMLElement;
}

function findBox(el: HTMLElement) {
  const display = getComputedStyle(el).display;
  const isDisplayContents = display === "contents";
  return isDisplayContents ? (el.firstElementChild as HTMLElement) : el;
}

function openInEditor(path: string, srcDir: string) {
  const resolvedURL = new URL(path, document.baseURI);
  if (resolvedURL.origin === location.origin) {
    const params = new URLSearchParams();
    params.set("file", srcDir + resolvedURL.pathname);
    fetch("/__open-in-editor?" + params.toString());
  } else {
    location.href = resolvedURL.href;
  }
}

function updateOverlay(
  hoverElement: HTMLElement | undefined,
  overlay: HTMLElement,
  isActive: () => boolean
) {
  if (hoverElement && isActive()) {
    const rect = findBox(hoverElement).getBoundingClientRect();
    overlay.style.setProperty("height", rect.height + "px");
    overlay.style.setProperty("width", rect.width + "px");
    overlay.style.setProperty("top", rect.top + "px");
    overlay.style.setProperty("left", rect.left + "px");
    overlay.style.setProperty("visibility", "visible");
    document.body.style.setProperty("cursor", "pointer");
    hoverElement.title = getDebugInfo(hoverElement);
  } else {
    overlay.style.setProperty("height", "0px");
    overlay.style.setProperty("width", "0px");
    overlay.style.setProperty("visibility", "hidden");
    document.body.style.removeProperty("cursor");
    hoverElement && (hoverElement.title = "");
  }
}

function getDebugInfo(element: HTMLElement & { performance?: any }) {
  let log = "web-widget[name=" + element.getAttribute("name") + "]";

  if (element.performance) {
    const labels = Object.keys(element.performance).map((key) =>
      key.replace(/([A-Z])/g, " $1").toLowerCase()
    );
    const titleMaxLength = Math.max(...labels.map((key) => key.length));
    const debugInfo = Object.values(element.performance).reduce(
      (log, value, index) => {
        log =
          log +
          "\n" +
          labels[index].padEnd(titleMaxLength + 4, "\u2002") +
          ": " +
          value;
        return log;
      },
      ""
    );
    log += "\n" + debugInfo;
  }

  return log;
}

export class HTMLWebWidgetInspectorElement extends HTMLElement {
  get dir() {
    return this.getAttribute("dir") || "";
  }

  set dir(value: string) {
    this.setAttribute("dir", value);
  }

  get keys() {
    return JSON.parse(this.getAttribute("keys") || "[]");
  }

  set keys(value: string[]) {
    this.setAttribute("keys", JSON.stringify(value));
  }

  connectedCallback() {
    const hotKeys = this.keys;
    const srcDir = this.dir;

    if (!document.querySelectorAll("web-widget[import]").length) {
      return;
    }

    this.appendChild(
      Object.assign(document.createElement("web-widget-inspector-info-popup"), {
        textContent: "Click-to-Source: " + hotKeys.join(" + "),
      })
    );

    console.debug(
      "%c ⇱ Web Widget Click-To-Source ",
      "background: linear-gradient(315deg,#afd760 25%,#0074a6); color: white; padding: 2px 3px; border-radius: 2px; font-size: 0.8em;",
      "Hold-press the " +
        hotKeys.join(" + ") +
        " key" +
        ((hotKeys.length > 1 && "s") || "") +
        " and click a component to jump directly to the source code in your IDE!"
    );

    const inspectorState: {
      pressedKeys: Set<string>;
      hoveredElement?: HTMLElement;
    } = {
      pressedKeys: new Set(),
    };

    const overlay = document.createElement("web-widget-inspector-overlay");
    overlay.setAttribute("aria-hidden", "true");
    this.appendChild(overlay);

    document.addEventListener(
      "keydown",
      (event) => {
        inspectorState.pressedKeys.add(event.code);
        updateOverlay(inspectorState.hoveredElement, overlay, isActive);
      },
      { capture: true }
    );

    document.addEventListener(
      "keyup",
      (event) => {
        inspectorState.pressedKeys.delete(event.code);
        updateOverlay(inspectorState.hoveredElement, overlay, isActive);
      },
      { capture: true }
    );

    window.addEventListener(
      "blur",
      () => {
        inspectorState.pressedKeys.clear();
        updateOverlay(inspectorState.hoveredElement, overlay, isActive);
      },
      { capture: true }
    );

    document.addEventListener(
      "mouseover",
      (event) => {
        const target = findContainer(event.target as HTMLElement);
        if (target) {
          inspectorState.hoveredElement = target;
        } else {
          inspectorState.hoveredElement = undefined;
        }
        updateOverlay(inspectorState.hoveredElement, overlay, isActive);
      },
      { capture: true }
    );

    document.addEventListener(
      "click",
      (event) => {
        if (isActive()) {
          inspectorState.pressedKeys.clear();
          const target = findContainer(event.target as HTMLElement);
          const inspectUrl = target?.getAttribute("import");
          if (inspectUrl) {
            event.preventDefault();
            document.body.style.setProperty("cursor", "progress");
            openInEditor(inspectUrl, srcDir);
          }
        }
      },
      { capture: true }
    );

    document.addEventListener(
      "contextmenu",
      (event) => {
        if (isActive()) {
          inspectorState.pressedKeys.clear();
          const target = findContainer(event.target as HTMLElement);
          if (target) {
            event.preventDefault();
          }
        }
      },
      { capture: true }
    );

    function checkKeysArePressed() {
      const activeKeys = Array.from(inspectorState.pressedKeys).map((key) =>
        key ? key.replace(/(Left|Right)$/g, "") : undefined
      );
      return hotKeys.every((key) => activeKeys.includes(key));
    }

    function isActive() {
      return checkKeysArePressed();
    }

    window.addEventListener("resize", () =>
      updateOverlay(inspectorState.hoveredElement, overlay, isActive)
    );

    document.addEventListener("scroll", () =>
      updateOverlay(inspectorState.hoveredElement, overlay, isActive)
    );

    this.appendChild(
      Object.assign(document.createElement("style"), {
        textContent: this.styles,
      })
    );
  }

  styles = `
  web-widget-inspector {
    display: contents;
  }

  web-widget-inspector-overlay {
    position: fixed;
    background: rgba(24, 182, 246, 0.27);
    pointer-events: none;
    box-sizing: border-box;
    border: 1px solid rgba(24, 182, 246, 0.46);
    border-radius: 4px;
    contain: strict;
    cursor: pointer;
    z-index: 999999;
  }

  web-widget-inspector-info-popup {
    position: fixed;
    bottom: 10px;
    right: 10px;
    font-family: monospace;
    background: #000000c2;
    color: white;
    padding: 10px 20px;
    border-radius: 8px;
    box-shadow:
      0 20px 25px -5px rgb(0 0 0 / 34%),
      0 8px 10px -6px rgb(0 0 0 / 24%);
    backdrop-filter: blur(4px);
    -webkit-animation: fadeOut 0.3s 3s ease-in-out forwards;
    animation: fadeOut 0.3s 3s ease-in-out forwards;
    z-index: 999999;
    contain: layout;
  }

  @-webkit-keyframes fadeOut {
    0% {
      opacity: 1;
    }

    100% {
      opacity: 0;
    }
  }

  @keyframes fadeOut {
    0% {
      opacity: 1;
    }

    100% {
      opacity: 0;
      visibility: hidden;
    }
  }`;
}

customElements.define("web-widget-inspector", HTMLWebWidgetInspectorElement);
