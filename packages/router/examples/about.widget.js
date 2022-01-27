export default () => {
  let main;
  console.log('About load');
  return {
    async bootstrap({ data }) {
      console.log('About bootstrap');
      main = document.createElement('main');
      main.innerHTML = `
        <h3>About</h3>
        <pre>${JSON.stringify(data, null, 2)}</pre>
      `;

      return new Promise(r => setTimeout(r, 3000));
    },
    async mount({ container }) {
      console.log('About mount');
      container.appendChild(main);
    },
    async unmount({ container }) {
      console.log('About unmount');
      container.removeChild(main);
    }
  };
};
