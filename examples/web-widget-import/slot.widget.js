define(() => {
  let element, style;
  return {
    async bootstrap() {
      console.log('slot bootstrap');
      element = document.createElement('div');
      element.className = 'box';
      style = document.createElement('style');
      style.textContent = `.box {
        border: 3px dashed #acacac;
        border-radius: 10px;
      }`;

      const slot = document.createElement('slot');
      slot.name = 'main';

      element.appendChild(slot);
    },

    async mount({ container }) {
      console.log('slot mount');
      container.appendChild(style);
      container.appendChild(element);
    },

    async unmount({ container }) {
      console.log('slot unmount');
      container.removeChild(style);
      container.removeChild(element);
      // throw Error('我是恶魔');
    }
  };
});
