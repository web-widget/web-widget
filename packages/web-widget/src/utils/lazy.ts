const placeholder = Symbol();
const isDisplayContents = (element: Element) =>
  getComputedStyle(element).display === "contents";

type PlaceholderElement = Element & {
  [placeholder]?: boolean;
};

const createPlaceholderElement = () =>
  Object.assign(document.createElement("span"), {
    [placeholder]: true,
  }) as PlaceholderElement;

const isPlaceholderElement = (element: Element) =>
  (element as PlaceholderElement)[placeholder];

export const createVisibleObserver = (
  element: Element,
  callback: () => void,
  options: IntersectionObserverInit = {}
) => {
  let observer: IntersectionObserver | null = new IntersectionObserver(
    (entries) => {
      for (const { isIntersecting, target } of entries) {
        if (!isIntersecting) {
          continue;
        }
        disconnect();
        if (isPlaceholderElement(target)) {
          target.remove();
        }
        callback();
        break;
      }
    },
    {
      rootMargin: "80%",
      ...options,
    }
  );

  const disconnect = () => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  };

  if (isDisplayContents(element)) {
    if (element.children.length) {
      for (const child of element.children) {
        observer.observe(child);
      }
    } else {
      const placeholderElement = createPlaceholderElement();
      observer.observe(element.appendChild(placeholderElement));
    }
  } else {
    observer.observe(element);
  }

  return disconnect;
};
