const placeholder = Symbol();
const isBox = (element: Element) =>
  ["contents", "none"].includes(getComputedStyle(element).display);

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

  if (isBox(element)) {
    const children = Array.from(element.children).filter(
      (node) => !isBox(node)
    );
    if (children.length) {
      for (const child of children) {
        observer.observe(child);
      }
    } else {
      const placeholderElement = createPlaceholderElement();

      element.firstChild
        ? element.insertBefore(placeholderElement, element.firstChild)
        : element.appendChild(placeholderElement);

      observer.observe(placeholderElement);
    }
  } else {
    observer.observe(element);
  }

  return disconnect;
};
