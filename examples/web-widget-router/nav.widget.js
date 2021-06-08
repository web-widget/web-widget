window.navigateToUrl = target => {
  let url;
  if (typeof target === 'string') {
    url = target;
  } else if (this && this.href) {
    // <a>
    url = this.href;
  } else if (
    target &&
    target.currentTarget &&
    target.currentTarget.href &&
    target.preventDefault
  ) {
    // events
    url = target.currentTarget.href;
    target.preventDefault();
  }

  const parseUri = uri => new URL(uri, document.baseURI);
  const current = parseUri(window.location.href);
  const destination = parseUri(url);

  if (url.indexOf('#') === 0) {
    window.location.hash = destination.hash;
  } else if (current.host !== destination.host && destination.host) {
    window.location.href = url;
  } else if (
    destination.pathname === current.pathname &&
    destination.search === current.search
  ) {
    window.location.hash = destination.hash;
  } else {
    // different path, host, or query params
    window.history.pushState(null, null, url);
  }
};

define(() => {
  let nav;
  console.log('nav load');
  return {
    async bootstrap() {
      console.log('nav bootstrap');
      nav = document.createElement('nav');
    },
    async mount({ container }) {
      console.log('nav mount');
      nav.innerHTML = `
    <a href="./" onclick="navigateToUrl(event)">Home</a> |
    <a href="./news" onclick="navigateToUrl(event)">News</a> |
    <a href="./about" onclick="navigateToUrl(event)">About</a>
    `;
      container.appendChild(nav);
    },
    async unmount({ container }) {
      console.log('nav unmount');
      container.removeChild(nav);
    }
  };
});
