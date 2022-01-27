/* eslint-disable no-restricted-globals */
/* global window, document, location, customElements, HTMLAnchorElement */
import { navigate } from './navigate.js';

const STATE = Symbol('state');
const REFLECT_ACTIVE = Symbol('reflect-active');
const FIND_ROUTERS = Symbol('find-routers');

export class HTMLWebLinkElement extends HTMLAnchorElement {
  constructor() {
    super();
    this[REFLECT_ACTIVE] = this[REFLECT_ACTIVE].bind(this);
  }

  get state() {
    if (!this[STATE]) {
      const json = this.getAttribute('state');

      if (json) {
        try {
          this[STATE] = JSON.parse(json);
        } catch (error) {
          this[STATE] = {};
        }
      }
    }

    return this[STATE];
  }

  set state(value) {
    if (typeof value === 'object') {
      this[STATE] = value;
    }
  }

  get replace() {
    return this.hasAttribute('replace');
  }

  set replace(value) {
    if (value) {
      this.setAttribute('replace', '');
    } else {
      this.removeAttribute('replace');
    }
  }

  get active() {
    return this[FIND_ROUTERS](true);
  }

  static get observedAttributes() {
    return ['state'];
  }

  connectedCallback() {
    this.addEventListener('click', event => {
      const to = this.pathname;
      if (this[FIND_ROUTERS]()) {
        navigate(to, {
          replace: this.replace,
          state: this.state
        });
        event.preventDefault();
      }
    });

    window.addEventListener('navigationstart', this[REFLECT_ACTIVE]);
    this[REFLECT_ACTIVE]();
  }

  disconnectedCallback() {
    window.removeEventListener('navigationstart', this[REFLECT_ACTIVE]);
  }

  attributeChangedCallback(name) {
    if (name === 'state') {
      delete this[STATE];
    }
  }

  [REFLECT_ACTIVE]() {
    if (this.active) {
      this.setAttribute('active', '');
    } else {
      this.removeAttribute('active');
    }
  }

  [FIND_ROUTERS](equal) {
    return (
      this.protocol === location.protocol &&
      this.host === location.host &&
      this.port === location.port &&
      [...document.querySelectorAll('web-router')].some(router =>
        equal
          ? router.match(this.pathname) === router.activeRoute
          : router.match(this.pathname)
      )
    );
  }
}

customElements.define('web-link', HTMLWebLinkElement, { extends: 'a' });
