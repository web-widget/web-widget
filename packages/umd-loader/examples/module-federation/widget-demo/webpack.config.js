/* eslint-disable no-undef */
// eslint-disable-next-line import/no-extraneous-dependencies
const { ModuleFederationPlugin } = require('webpack').container;
const ExternalTemplateRemotesPlugin = require('external-remotes-plugin');
const path = require('path');

module.exports = {
  entry: './src/index.widget',
  mode: 'development',
  devServer: {
    static: path.join(__dirname, 'dist'),
    port: 3003,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers':
        'X-Requested-With, content-type, Authorization'
    }
  },
  output: {
    filename: 'index.widget.js',
    library: {
      type: 'umd',
      name: 'widgetDemo'
    }
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'widget-demo',
      remotes: {
        app2: 'app2@[app1Url]/remoteEntry.js'
      },
      shared: { react: { singleton: true }, 'react-dom': { singleton: true } }
    }),
    new ExternalTemplateRemotesPlugin()
  ],
  optimization: {
    minimize: false
  }
};
