# Web Widget

[![CI](https://github.com/web-widget/web-widget/actions/workflows/test.yml/badge.svg?event=push)](https://github.com/web-widget/web-widget/actions/workflows/test.yml?query=event%3Apush)

> ⚠️ This project is undergoing internal testing and may have unknown problems.

It is a web application framework designed to give new impetus to all front-end frameworks.

| Name             | Description                                         | Examples                                                                                                                                                           |
| ---------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [React](./react) | Example of using React as the main technology stack | [![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/web-widget/web-widget/tree/main/examples/react) |
| [Vue](./vue)     | Example of using Vue as the main technology stack   | [![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/web-widget/web-widget/tree/main/examples/vue)   |

## Features

### Fast

Use web streaming to accelerate page display; server-side components reduce client-side JS, streaming State and selective hydration to reduce lag.

### Flexibility

It does not come with a new technology stack, but it can drive UI technology stacks such as React and Vue at the same time, and provides performance optimization methods at a higher level.

### Web standards

The project is designed to comply with the standards set by [WinterCG](https://wintercg.org/), it can run in Node.js and Edge environments. The client supports native ESM and Importmap, and is compatible with Chrome 67+.

### Technology stack interoperability

Different technology stacks are isolated through component container technology. For example, React components can be embedded in Vue components, and Vue components can also introduce React components.

## Links

- [Full examples](https://github.com/web-widget/web-widget/tree/main/examples/web-router)
- [Document](https://github.com/web-widget/web-widget/tree/main/docs)
