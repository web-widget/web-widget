# Web Widget

[![CI](https://github.com/web-widget/web-widget/actions/workflows/test.yml/badge.svg?event=push)](https://github.com/web-widget/web-widget/actions/workflows/test.yml?query=event%3Apush)

It is a web application framework designed to give new impetus to all front-end frameworks.

> This project is currently in the preview stage, and the API is subject to significant changes at any time.

## Motivation

In many enterprises, technology stack lock-in is a common phenomenon. For instance, if a large project is initially built with Vue 2, upgrading to Vue 3 later may become a significant challenge. This project aims to introduce a scalable architecture. By doing so, it enables enterprises to gradually upgrade their UI framework versions or explore alternative frameworks, thereby continuously improving both the user experience and the developer experience.

## Features

### Fast

Use web streaming to accelerate page display; server-side components reduce client-side JS, streaming State and selective hydration to reduce lag.

### Flexibility

It does not come with a new technology stack, but it can drive UI technology stacks such as React and Vue at the same time, and provides performance optimization methods at a higher level.

### Web standards

The project is designed to comply with the standards set by [WinterCG](https://wintercg.org/), it can run in Node.js and Edge environments. The client supports native ESM and Importmap, and is compatible with Chrome 67+.

### Technology stack interoperability

Different technology stacks are isolated through component container technology. For example, React components can be embedded in Vue components, and Vue components can also introduce React components.

## Examples

| Name             | Description                                         | Examples                                                                                                                                                           |
| ---------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [React](./examples/react) | Use **React** to render pages and load interactive components of **Vue** and **React** | [![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/web-widget/web-widget/tree/main/examples/react) |
| [Vue](./examples/vue)     | Use **Vue** to render pages and load interactive components of **React** and **Vue** | [![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/web-widget/web-widget/tree/main/examples/vue)   |
| ... | ... | ... |

## Who Uses This

- <https://www.insmind.com> Use **React** to render pages and load interactive components of **Vue3** and **Vue2**.
- <https://www.gaoding.com> Use **React** to render pages and load interactive components of **Vue2**.
