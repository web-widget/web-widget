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

window.vueTodomvc = () => ({
  async mount() {
    document.body.innerHTML = `<div id="app"></div>`;
    await importScript('./libs/vue.runtime.js');
    await importScript('./libs/app.js');
  }
});
