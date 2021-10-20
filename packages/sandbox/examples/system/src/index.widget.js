// eslint-disable-next-line import/no-unresolved
import sayHello from 'hello';

export default () => {
  let element;
  return {
    async bootstrap({ data }) {
      element = document.createElement('div');
      element.innerHTML = `${sayHello()}: ${JSON.stringify(data, null, 2)}`;
    },

    async mount({ container }) {
      container.appendChild(element);
    },

    async unmount({ container }) {
      container.removeChild(element);
    }
  };
};
