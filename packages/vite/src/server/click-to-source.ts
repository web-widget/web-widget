function html(strings: TemplateStringsArray, ...args: any) {
  let buf = strings[0];
  let i = 0;
  while (i < args.length) {
    buf += args[i];
    buf += strings[++i];
  }
  return buf;
}

// This utility is based on https://github.com/BuilderIO/qwik/
// License: https://github.com/BuilderIO/qwik/blob/5f1c80372dc95b7d1de4b909baed3c08d5eeac2c/LICENSE
export default ({
  hotKeys = ["Alt"],
  srcDir,
}: {
  hotKeys?: string[];
  srcDir: string;
}) =>
  html`<style>
      #web-widget-inspector-overlay {
        position: fixed;
        background: rgba(24, 182, 246, 0.27);
        pointer-events: none;
        box-sizing: border-box;
        border: 2px solid rgba(172, 126, 244, 0.46);
        border-radius: 4px;
        contain: strict;
        cursor: pointer;
        z-index: 999999;
      }

      #web-widget-inspector-info-popup {
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

      #web-widget-inspector-info-popup p {
        margin: 0px;
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
      }
    </style>
    <div id="web-widget-inspector-info-popup" aria-hidden="true">
      Click-to-Source
    </div>
    <script>
      (function () {
        const inspectAttribute = "data-web-widget-inspector";
        const hotKeys = ${JSON.stringify(hotKeys)};
        const srcDir = ${JSON.stringify(srcDir)};
        document.querySelector("#web-widget-inspector-info-popup").textContent =
          "Click-to-Source: " + hotKeys.join(" + ");
        console.debug(
          "%c ⇱ Web Widget Click-To-Source ",
          "background: linear-gradient(315deg,#afd760 25%,#0074a6); color: white; padding: 2px 3px; border-radius: 2px; font-size: 0.8em;",
          "Hold-press the " +
            hotKeys.join(" + ") +
            " key" +
            ((hotKeys.length > 1 && "s") || "") +
            " and click a component to jump directly to the source code in your IDE!"
        );
        const inspectorState = {
          pressedKeys: new Set(),
        };
        const origin = location.origin;
        const body = document.body;
        const overlay = document.createElement("div");
        overlay.id = "web-widget-inspector-overlay";
        overlay.setAttribute("aria-hidden", "true");
        body.appendChild(overlay);

        function findContainer(el) {
          if (el && el instanceof Element) {
            return el.closest("web-widget[import]");
          }
          return null;
        }

        document.addEventListener(
          "keydown",
          (event) => {
            inspectorState.pressedKeys.add(event.code);
            updateOverlay();
          },
          { capture: true }
        );

        document.addEventListener(
          "keyup",
          (event) => {
            inspectorState.pressedKeys.delete(event.code);
            updateOverlay();
          },
          { capture: true }
        );

        window.addEventListener(
          "blur",
          (event) => {
            inspectorState.pressedKeys.clear();
            updateOverlay();
          },
          { capture: true }
        );

        document.addEventListener(
          "mouseover",
          (event) => {
            const target = findContainer(event.target);
            if (target) {
              inspectorState.hoveredElement = target;
            } else {
              inspectorState.hoveredElement = undefined;
            }
            updateOverlay();
          },
          { capture: true }
        );

        document.addEventListener(
          "click",
          (event) => {
            if (isActive()) {
              inspectorState.pressedKeys.clear();
              const target = findContainer(event.target);
              if (target) {
                event.preventDefault();
                const inspectUrl = target.getAttribute("import");
                body.style.setProperty("cursor", "progress");
                openInEditor(inspectUrl);
              }
            }
          },
          { capture: true }
        );

        function openInEditor(path) {
          const resolvedURL = new URL(path, document.baseURI);
          if (resolvedURL.origin === origin) {
            const params = new URLSearchParams();
            params.set("file", srcDir + resolvedURL.pathname);
            fetch("/__open-in-editor?" + params.toString());
          } else {
            location.href = resolvedURL.href;
          }
        }

        document.addEventListener(
          "contextmenu",
          (event) => {
            if (isActive()) {
              inspectorState.pressedKeys.clear();
              const target = findContainer(event.target);
              if (target) {
                event.preventDefault();
              }
            }
          },
          { capture: true }
        );

        function updateOverlay() {
          const hoverElement = inspectorState.hoveredElement;
          if (hoverElement && isActive()) {
            const rect = hoverElement.getBoundingClientRect();
            overlay.style.setProperty("height", rect.height + "px");
            overlay.style.setProperty("width", rect.width + "px");
            overlay.style.setProperty("top", rect.top + "px");
            overlay.style.setProperty("left", rect.left + "px");
            overlay.style.setProperty("visibility", "visible");
            body.style.setProperty("cursor", "pointer");
          } else {
            overlay.style.setProperty("height", "0px");
            overlay.style.setProperty("width", "0px");
            overlay.style.setProperty("visibility", "hidden");
            body.style.removeProperty("cursor");
          }
        }

        function checkKeysArePressed() {
          const activeKeys = Array.from(inspectorState.pressedKeys).map(
            (key) => (key ? key.replace(/(Left|Right)$/g, "") : undefined)
          );
          return hotKeys.every((key) => activeKeys.includes(key));
        }

        function isActive() {
          return checkKeysArePressed();
        }

        window.addEventListener("resize", updateOverlay);
        document.addEventListener("scroll", updateOverlay);
      })();
    </script>`;
