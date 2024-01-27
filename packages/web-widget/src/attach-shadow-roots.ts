/* @stringify >>> */
export default `(${function attachShadowRoots(
  root: DocumentFragment | Document = document
) {
  (
    root.querySelectorAll(
      "template[shadowrootmode]"
    ) as NodeListOf<HTMLTemplateElement>
  ).forEach((template) => {
    const mode = template.getAttribute("shadowrootmode") as "closed" | "open";
    const host = template.parentNode as Element & {
      attachInternals: Function;
    };
    const shadowRoot = host.attachShadow({
      mode,
    });
    const attachInternals = host.attachInternals;

    Object.assign(host, {
      attachShadow() {
        shadowRoot.innerHTML = "";
        return shadowRoot;
      },
      attachInternals() {
        const ei = attachInternals ? attachInternals.call(this, arguments) : {};
        return Object.create(ei, {
          shadowRoot: { value: shadowRoot },
        });
      },
    });

    shadowRoot.appendChild((template as HTMLTemplateElement).content);
    template.remove();
    attachShadowRoots(shadowRoot);
  });
}})()`;
/* @stringify <<< */
