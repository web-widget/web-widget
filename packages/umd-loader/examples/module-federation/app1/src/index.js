// eslint-disable-next-line import/no-extraneous-dependencies
import '@web-widget/container';
import '../../../../src/index.js';

const widget = document.createElement('web-widget');
widget.type = 'umd';
widget.name = 'widgetDemo';
widget.src = 'http://localhost:3003/index.widget.js';

document.getElementById('root').appendChild(widget);
