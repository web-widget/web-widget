define(() => {
  let div;
  console.log('about load');
  return {
    async bootstrap() {
      console.log('about bootstrap');
      div = document.createElement('div');
    },
    async mount({ container, data }) {
      console.log('about mount');
      div.innerHTML = `
        <web-widget id="nav" src="./nav.widget.js"></web-widget>
        <main>
          <h3>About</h3>
          <pre>${JSON.stringify(data, null, 2)}</pre>
        </main>
      `;
      container.appendChild(div);
    },
    async unmount({ container }) {
      console.log('about unmount');
      container.removeChild(div);
    }
  };
});
