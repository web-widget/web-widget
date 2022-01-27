window.$navigate = function (event) {
  window.dispatchEvent(
    new CustomEvent('webrouter:navigate', {
      detail: { path: event.target.getAttribute('href') }
    })
  );
  event.preventDefault();
};

export default () => {
  let nav;
  console.log('nav load');
  return {
    async bootstrap() {
      console.log('nav bootstrap');
      nav = document.createElement('nav');
    },
    async mount({ container }) {
      console.log('nav mount');
      nav.innerHTML = `
        <a is="web-link" href="/">Home</a> |
        <a is="web-link" href="/news">News</a> |
        <a is="web-link" href="/about">About</a> |
        <a is="web-link" href="/vue-router">Vue router</a> |
        <a is="web-link" href="/404">404</a>
      `;
      container.appendChild(nav);
    },
    async unmount({ container }) {
      console.log('nav unmount');
      container.removeChild(nav);
    }
  };
};
