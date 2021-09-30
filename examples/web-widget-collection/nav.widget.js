export default () => {
  let nav;
  console.log('nav load');
  return {
    async bootstrap() {
      console.log('nav bootstrap');
      nav = document.createElement('nav');
      // 模拟加载延迟
      return new Promise(resolve => {
        setTimeout(() => {
          resolve();
        }, 500);
      });
    },
    async mount({ container }) {
      console.log('nav mount');
      nav.innerHTML = `
        <a href="/" onclick="navigateToUrl(event)">Home</a> |
        <a href="/news" onclick="navigateToUrl(event)">News</a> |
        <a href="/about" onclick="navigateToUrl(event)">About</a> |
        <a href="/vue-router" onclick="navigateToUrl(event)">Vue router</a>
      `;
      container.appendChild(nav);
    },
    async unmount({ container }) {
      console.log('nav unmount');
      container.removeChild(nav);
    }
  };
};
