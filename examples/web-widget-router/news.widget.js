define(() => {
  let main, nav;
  console.log('News load');
  return {
    async bootstrap({ data }) {
      console.log('News bootstrap');
      main = document.createElement('main');
      main.innerHTML = `
        <h3>News</h3>
        <pre>${JSON.stringify(data, null, 2)}</pre>
      `;

      nav = document.createElement('web-widget');
      nav.src = './nav.widget.js';
      nav.inactive = true;
    },
    async mount({ container }) {
      console.log('News mount');

      container.appendChild(nav);
      await nav.mount();

      container.appendChild(main);
    },
    async unmount({ container }) {
      console.log('News unmount');
      container.removeChild(nav);
      container.removeChild(main);
    }
  };
});
