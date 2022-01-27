function guardian() {
  window.addEventListener(
    'willchangestate',
    e => {
      // Check if we should navigate away from this page
      if (!confirm('You have unsafed data. Do you wish to discard it?')) {
        e.preventDefault();
        guardian();
      }
    },
    { once: true }
  );
}

export default () => {
  let main;
  console.log('News load');
  return {
    async bootstrap({ data }) {
      console.log('News bootstrap');
      main = document.createElement('main');
      main.innerHTML = `
        <h3>News</h3>
        <a is="web-link" href="/news/778">details</a>
        <pre>${JSON.stringify(data, null, 2)}</pre>
      `;
    },
    async mount({ container }) {
      console.log('News mount');
      container.appendChild(main);
      guardian();
    },
    async unmount({ container }) {
      console.log('News unmount');
      container.removeChild(main);
    }
  };
};
