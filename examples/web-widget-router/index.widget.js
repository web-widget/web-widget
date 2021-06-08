define(() => {
  let div, nav;
  console.log('index load');
  return {
    async bootstrap() {
      console.log('index bootstrap');
      div = document.createElement('div');
    },
    async mount({ container, data }) {
      console.log('index mount');
      div.innerHTML = `
        <web-widget id="nav" src="./nav.widget.js"></web-widget>
        <main>
          <h3>Home</h3>
          <pre>${JSON.stringify(data, null, 2)}</pre>
        </main>
      `;
      container.appendChild(div);
    },
    async unmount({ container }) {
      console.log('index unmount');
      container.removeChild(div);
    }
  };
});
