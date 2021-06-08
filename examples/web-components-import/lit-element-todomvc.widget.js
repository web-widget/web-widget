function loader(element) {
  return new Promise((resolve, reject) => {
    element.addEventListener('load', () => {
      resolve();
    });
    element.addEventListener('error', e => {
      reject(e);
    });
    document.head.appendChild(element);
  });
}

function importScript(url) {
  const script = document.createElement('script');
  script.src = url;
  return loader(script);
}

let element;
console.log('todomvc load');
define({
  async bootstrap() {
    console.log('todomvc bootstrap');

    if (customElements.get('my-todo')) {
      return Promise.resolve();
    }

    return importScript('./libs/lit-element-todomvc.js');
  },

  async mount({ container }) {
    console.log('todomvc mount');
    element = document.createElement('my-todo');
    container.appendChild(element);
  },

  async unmount({ container }) {
    console.log('todomvc unmount');
    container.removeChild(element);
  },
  async unload() {
    console.log('todomvc unload');
    element = null;
  }
});
