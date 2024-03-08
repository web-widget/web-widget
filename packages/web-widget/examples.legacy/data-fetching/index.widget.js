export const handler = async ({ render }) => {
  const response = await fetch(new URL('./data.json', import.meta.url));
  return render({ data: await response.json() });
};

export const render = ({ container, data }) => {
  let element;
  return {
    async mount() {
      element = document.createElement('pre');
      element.innerHTML = JSON.stringify(data, null, 2);
      container.appendChild(element);
    },

    async unmount() {
      container.removeChild(element);
    },
  };
};
