export default () => ({
  async bootstrap() {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(new Error('bootstrap error'));
      }, 500);
    });
  }
});
