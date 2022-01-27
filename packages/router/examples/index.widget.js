export default () => {
  let main;
  console.log('Home load');
  return {
    async bootstrap({ data }) {
      console.log('Home bootstrap');
      main = document.createElement('main');
      main.innerHTML = `
        <h3>Home</h3>
        <pre>${JSON.stringify(data, null, 2)}</pre>
      `;
    },
    async mount({ container }) {
      console.log('Home mount');
      container.appendChild(main);
    },
    async unmount({ container }) {
      console.log('Home unmount');
      container.removeChild(main);
    }
  };
};
