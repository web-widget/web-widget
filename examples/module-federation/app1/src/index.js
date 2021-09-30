import '../../../../src/index.js';
import '../../../../extensions/WebWidgerUmdLoader.js';

const widget = document.createElement('web-widget');
widget.type = 'umd';
widget.name = 'widgetDemo';
widget.src = 'http://localhost:3003/index.widget.js';

document.getElementById('root').appendChild(widget);;