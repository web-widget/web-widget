const CALLBACK = Symbol("callback");

const lazyObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(({ isIntersecting, target }) => {
      if (isIntersecting) {
        target[CALLBACK]();
        unobserve(target);
      }
    });
  },
  {
    rootMargin: "80%",
  }
);

export function observe(view: Element, callback) {
  lazyObserver.observe(view);
  view[CALLBACK] = callback;
}

export function unobserve(view: Element) {
  lazyObserver.unobserve(view);
  delete view[CALLBACK];
}
