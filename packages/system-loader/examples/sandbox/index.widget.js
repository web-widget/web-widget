System.register(['hello'], exports => {
  'use strict';

  let sayHello;
  return {
    setters: [
      function (module) {
        sayHello = module.default;
      }
    ],
    execute() {
      exports('default', () => {
        let element;
        return {
          async bootstrap({ data }) {
            element = document.createElement('div');
            element.innerHTML = `${sayHello()}: ${JSON.stringify(
              data,
              null,
              2
            )}`;
          },

          async mount({ container }) {
            container.appendChild(element);
          },

          async unmount({ container }) {
            container.removeChild(element);
          }
        };
      });
    }
  };
});
