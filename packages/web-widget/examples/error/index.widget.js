export default () => ({
  async bootstrap() {
    throw new Error("test error");
  },
});
