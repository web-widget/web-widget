System.register([], function (_export) {
  return {
    execute() {
      window.TEST_SYSTEM_LIFECYCLE = 'load';

      _export('default', () => ({
        async bootstrap() {
          window.TEST_SYSTEM_LIFECYCLE = 'bootstrap';
        },

        async mount({ container }) {
          window.TEST_SYSTEM_LIFECYCLE = 'mount';
          container.innerHTML = `hello wrold`;
        },

        async unmount({ container }) {
          window.TEST_SYSTEM_LIFECYCLE = 'unmount';
          container.removeChild = ``;
        }
      }));
    }
  };
});
