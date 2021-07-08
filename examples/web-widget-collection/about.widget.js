define(() => {
  let main, nav;
  console.log('About load');
  return {
    async bootstrap({ container, dataset }) {
      console.log('About bootstrap');
      main = document.createElement('main');
      main.innerHTML = `
        <h3>About</h3>
        <pre>${JSON.stringify(dataset, null, 2)}</pre>
      `;

      nav = document.createElement('web-widget');
      nav.src = '/nav.widget.js';
      nav.inactive = true;
      container.appendChild(nav);
      return nav.bootstrap();
    },
    async mount({ container }) {
      console.log('About mount');
      await nav.mount();
      container.appendChild(main);
    },
    async unmount({ container }) {
      console.log('About unmount');
      await nav.unmount();
      container.removeChild(main);
    }
  };
});
