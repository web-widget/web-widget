const CALLBACK = Symbol("callback");

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

export function observe(view: Element, callback: () => void) {
  lazyObserver.observe(view);
  // @ts-ignore
  view[CALLBACK] = callback;
}

export function unobserve(view: Element) {
  lazyObserver.unobserve(view);
  // @ts-ignore
  delete view[CALLBACK];
}
