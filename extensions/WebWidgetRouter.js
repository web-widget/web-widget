/* eslint-disable no-restricted-globals */
/* global document, location, URL */
import { createBrowserHistory } from 'history';
import { WebWidgetCollection } from './WebWidgetCollection.js';

export const history = createBrowserHistory();
export const collection = new WebWidgetCollection();

export function navigate(target) {
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
  const current = parseUri(location.href);
  const destination = parseUri(url);

  if (url.indexOf('#') === 0) {
    location.hash = destination.hash;
  } else if (current.host !== destination.host && destination.host) {
    location.href = url;
  } else if (
    destination.pathname === current.pathname &&
    destination.search === current.search
  ) {
    location.hash = destination.hash;
  } else {
    history.push(url, { some: 'state' });
  }
}
