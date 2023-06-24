export default (a) => {
  console.log(a.data);
  let element;
  return {
    async bootstrap() {
      element = document.createElement("div");
      element.innerHTML = `hello wrold`;
    },

    async mount({ container }) {
      container.appendChild(element);
    },

    async unmount({ container }) {
      container.removeChild(element);
    },
  };
};
