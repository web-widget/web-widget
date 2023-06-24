let element;

export async function bootstrap() {
  element = document.createElement("div");
  element.innerHTML = `hello wrold`;
}

export async function mount({ container }) {
  container.appendChild(element);
}

export async function unmount({ container }) {
  container.removeChild(element);
}
