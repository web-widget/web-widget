define(() => {
  let main, nav;
  console.log('Home load');
  return {
    async bootstrap({ dataset }) {
      console.log('Home bootstrap');
      main = document.createElement('main');
      main.innerHTML = `
        <h3>Home</h3>
        <pre>${JSON.stringify(dataset, null, 2)}</pre>
      `;

      nav = document.createElement('web-widget');
      nav.src = './nav.widget.js';
      nav.inactive = true;
    },
    async mount({ container }) {
      console.log('Home mount');

      container.appendChild(nav);
      await nav.mount();

      container.appendChild(main);
    },
    async unmount({ container }) {
      console.log('Home unmount');
      container.removeChild(nav);
      container.removeChild(main);
    }
  };
});
