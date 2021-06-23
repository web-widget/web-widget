define(() => {
  let main, nav;
  console.log('Home load');
  return {
    async bootstrap({ container, dataset }) {
      console.log('Home bootstrap');
      main = document.createElement('main');
      main.innerHTML = `
        <h3>Home</h3>
        <pre>${JSON.stringify(dataset, null, 2)}</pre>
      `;

      nav = document.createElement('web-widget');
      nav.src = './nav.widget.js';
      nav.hidden = true;
      container.appendChild(nav);
      return nav.bootstrap();
    },
    async mount({ container }) {
      console.log('Home mount');
      nav.hidden = false;
      container.appendChild(main);
    },
    async unmount({ container }) {
      console.log('Home unmount');
      nav.hidden = true;
      container.removeChild(main);
    }
  };
});
