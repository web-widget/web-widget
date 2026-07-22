export const menuEnhancementScript =
  `(function(){var m=document.querySelector('[data-playground-menu]');` +
  `if(!m||m.dataset.enhanced==='true')return;m.dataset.enhanced='true';` +
  `var p=location.pathname;m.querySelectorAll('a[href]').forEach(function(a){` +
  `if(a.getAttribute('href')===p)a.setAttribute('aria-current','page')});` +
  `try{var k='web-router-playground:menu-scroll',s=sessionStorage.getItem(k);` +
  `if(s!==null)m.scrollTop=Number(s);var save=function(){sessionStorage.setItem(k,String(m.scrollTop))};` +
  `m.addEventListener('click',save);window.addEventListener('pagehide',save)}catch(e){}})();`;
