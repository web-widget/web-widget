/* eslint-disable no-console, no-undef */
export default (name, message = '') =>
  console.warn(
    `Web Widget: "${name}" API is about to be deprecated. ${message}`
  );
