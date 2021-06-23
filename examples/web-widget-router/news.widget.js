define(() => {
  let main, nav;
  console.log('News load');
  return {
    async bootstrap({ container, dataset }) {
      console.log('News bootstrap');
      main = document.createElement('main');
      main.innerHTML = `
        <h3>News</h3>
        <pre>${JSON.stringify(dataset, null, 2)}</pre>
      `;

      nav = document.createElement('web-widget');
      nav.src = './nav.widget.js';
      nav.hidden = true;
      container.appendChild(nav);
      return nav.bootstrap();
    },
    async mount({ container }) {
      console.log('News mount');
      nav.hidden = false;
      container.appendChild(main);
    },
    async unmount({ container }) {
      console.log('News unmount');
      nav.hidden = true;
      container.removeChild(main);
    }
  };
});
