define(() => {
  let main, nav;
  console.log('About load');
  return {
    async bootstrap({ data }) {
      console.log('About bootstrap');
      main = document.createElement('main');
      main.innerHTML = `
        <h3>About</h3>
        <pre>${JSON.stringify(data, null, 2)}</pre>
      `;

      nav = document.createElement('web-widget');
      nav.src = './nav.widget.js';
      nav.inactive = true;
    },
    async mount({ container }) {
      console.log('About mount');

      nav.hidden = true;
      container.appendChild(nav);
      await nav.mount();
      nav.hidden = false;

      container.appendChild(main);
    },
    async unmount({ container }) {
      console.log('About unmount');
      container.removeChild(nav);
      container.removeChild(main);
    }
  };
});
