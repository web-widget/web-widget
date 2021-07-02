import { registry } from './WebWidgetRouter/applications/registry.js';

export { start } from './WebWidgetRouter/start.js';
export const register = registry.register.bind(registry);
export const unregister = registry.unregister.bind(registry);
