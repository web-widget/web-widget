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

window.reactTodomvc = () => ({
  async mount() {
    document.body.innerHTML = `<section class="todo-appmvc"></section>`;
    await importScript('./react.min.js');
    await importScript('./bundle.js');
  }
});
