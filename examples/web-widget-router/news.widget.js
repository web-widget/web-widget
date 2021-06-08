define(() => {
  let div;
  console.log('news load');
  return {
    async bootstrap() {
      console.log('news bootstrap');
      div = document.createElement('div');
    },
    async mount({ container, data }) {
      console.log('news mount');
      div.innerHTML = `
        <web-widget id="nav" src="./nav.widget.js"></web-widget>
        <main>
          <h3>News</h3>
          <pre>${JSON.stringify(data, null, 2)}</pre>
        </main>
      `;
      container.appendChild(div);
    },
    async unmount({ container }) {
      console.log('news unmount');
      container.removeChild(div);
    }
  };
});
