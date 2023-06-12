window.TEST_LIFECYCLE = 'load';

export async function bootstrap() {
  window.TEST_LIFECYCLE = 'bootstrap';
}

export async function mount({ container }) {
  window.TEST_LIFECYCLE = 'mount';
  container.innerHTML = `hello wrold`;
}

export async function unmount({ container }) {
  window.TEST_LIFECYCLE = 'unmount';
  container.removeChild = ``;
}
