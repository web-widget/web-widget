const CALLBACK = Symbol("callback");
const BOX = Symbol("box");

const lazyObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(({ isIntersecting, target }) => {
      if (isIntersecting) {
        // @ts-ignore
        target[CALLBACK]();
        unobserve(target);
      }
    });
  },
  {
    rootMargin: "80%",
  }
);

function getBox(view: Element) {
  const display = getComputedStyle(view).display;
  const isDisplayContents = display === "contents";
  return isDisplayContents
    ? view.firstElementChild || view.parentElement!
    : view;
}

export function observe(node: Element, callback: () => void) {
  const view = getBox(node);
  lazyObserver.observe(view);
  // @ts-ignore
  view[CALLBACK] = callback;
  // @ts-ignore
  view[BOX] = view;
}

export function unobserve(node: Element) {
  // @ts-ignore
  const view = node[BOX];
  lazyObserver.unobserve(view);
  // @ts-ignore
  delete view[CALLBACK];
  // @ts-ignore
  delete view[BOX];
}
