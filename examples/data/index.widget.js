define(() => {
  let element;
  return {
    async mount({ data, container, context }) {
      console.log('mount');
      element = document.createElement('div');
      container.appendChild(element);

      const code = document.createElement('pre');
      code.textContent = JSON.stringify(data, null, 2);
      element.appendChild(code);

      const update = document.createElement('button');
      update.innerText = 'update';
      update.onclick = () => {
        context.update({
          data: {
            id: data.id,
            username: `@${Date.now()}`
          }
        });
      };
      element.appendChild(update);
    },

    async update() {
      console.log('update');
    },

    async unmount({ container }) {
      console.log('unmount');
      container.removeChild(element);
    }
  };
});
