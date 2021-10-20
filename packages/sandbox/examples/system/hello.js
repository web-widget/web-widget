System.register([], exports => {
  'use strict';

  return {
    execute() {
      exports('default', () => 'hello wrold');
    }
  };
});
