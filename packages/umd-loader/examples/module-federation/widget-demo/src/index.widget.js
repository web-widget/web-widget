// You can write your own logic here to determine the actual url
window.app1Url = 'http://localhost:3002';

export default () => {
  let element, remoteElement, React;
  return {
    async bootstrap() {
      React = await import('react');
      // eslint-disable-next-line import/no-unresolved
      remoteElement = await import('app2/App');
    },

    async mount({ container }) {
      element = document.createElement('div');
      Object.assign(element.style, {
        margin: '10px',
        padding: '10px',
        textAlign: 'center',
        backgroundColor: 'greenyellow'
      });
      element.innerHTML = `Hello React: ${React.version}`;
      container.appendChild(element);
      container.appendChild(remoteElement.default());
    },

    async unmount({ container }) {
      container.removeChild(element);
    }
  };
};
