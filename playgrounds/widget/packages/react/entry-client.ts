import '@web-widget/web-widget';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const element = document.getElementById('app')!;
const WrapApp = React.createElement(
  React.StrictMode,
  null,
  React.createElement(App, null)
);

if (import.meta.env.VITE_HYDRATE_MODE) {
  ReactDOM.hydrateRoot(element, WrapApp);
} else {
  ReactDOM.createRoot(element).render(WrapApp);
}
