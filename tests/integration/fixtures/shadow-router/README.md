# Shadow Router Fixture

This fixture owns the Vite/Web Router coverage for Shadow DOM SSR styles. Keep
it independent from `playgrounds/` so demo routes and dependencies cannot alter
the integration contract.

The fixture deliberately uses only:

- React for widget CSS Modules;
- Vue 3 for CSS Modules plus scoped virtual CSS;
- route CSS for document-versus-ShadowRoot ownership;
- development HMR and production asset builds.

Cross-framework hydration coverage belongs to the main integration application,
not this asset-pipeline fixture.
