const placeholder = Symbol();
const isBox = (element: Element) =>
  ['contents', 'none'].includes(getComputedStyle(element).display);

type PlaceholderElement = Element & {
  [placeholder]?: boolean;
};

const createPlaceholderElement = () => {
  const element = Object.assign(document.createElement('span'), {
    [placeholder]: true,
  }) as PlaceholderElement;
  element.style.cssText = 'display:block;width:1px;height:1px';
  return element;
};

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
      rootMargin: '80%',
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
    const shadowRoot = element.shadowRoot;
    const shadowTarget = shadowRoot
      ? Array.from(shadowRoot.querySelectorAll('*')).find(
          (node) => !isBox(node)
        )
      : undefined;
    const children = shadowRoot
      ? shadowTarget
        ? [shadowTarget]
        : []
      : Array.from(element.children).filter((node) => !isBox(node));
    if (children.length) {
      for (const child of children) {
        observer.observe(child);
      }
    } else {
      const placeholderElement = createPlaceholderElement();

      const root = shadowRoot ?? element;
      root.firstChild
        ? root.insertBefore(placeholderElement, root.firstChild)
        : root.appendChild(placeholderElement);

      observer.observe(placeholderElement);
    }
  } else {
    observer.observe(element);
  }

  return disconnect;
};
