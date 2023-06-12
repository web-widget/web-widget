/* eslint-disable no-use-before-define */
/* global IntersectionObserver */

const CALLBACK = Symbol('callback');

const lazyObserver = new IntersectionObserver(
  entries => {
    entries.forEach(({ isIntersecting, target }) => {
      if (isIntersecting) {
        target[CALLBACK]();
        unobserve(target);
      }
    });
  },
  {
    rootMargin: '80%'
  }
);

export function observe(view, callback) {
  lazyObserver.observe(view);
  view[CALLBACK] = callback;
}

export function unobserve(view) {
  lazyObserver.unobserve(view);
  delete view[CALLBACK];
}
