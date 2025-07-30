/**
 * @fileoverview Base Framework Adapter
 * Provides unified interface and error handling for all framework adapters
 */

export class BaseAdapter {
  constructor(name) {
    this.name = name;
    this.status = 'initialized';
    this.errors = [];
    this.warnings = [];
    this.info = [];
  }

  /**
   * Log message with structured format for subprocess communication
   */
  log(level, message, data = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      framework: this.name,
      message,
      data,
    };

    // Output structured JSON for parent process to parse
    console.log(JSON.stringify(logEntry));
  }

  /**
   * Log error with stack trace
   */
  error(message, error = null) {
    this.errors.push({ message, error });
    this.log(
      'error',
      message,
      error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : null
    );
  }

  /**
   * Log warning
   */
  warning(message, data = null) {
    this.warnings.push({ message, data });
    this.log('warning', message, data);
  }

  /**
   * Log info
   */
  info(message, data = null) {
    this.info.push({ message, data });
    this.log('info', message, data);
  }

  /**
   * Update status
   */
  updateStatus(status, message = null) {
    this.status = status;
    if (message) {
      this.info(`Status: ${status}`, { message });
    }
  }

  /**
   * Check if framework is supported
   * Override in subclasses
   */
  isSupported() {
    return true;
  }

  /**
   * Create application instance
   * Override in subclasses
   */
  createApp() {
    throw new Error('createApp must be implemented by subclass');
  }

  /**
   * Register a route
   * Override in subclasses
   */
  registerRoute(app, route, expected, description) {
    throw new Error('registerRoute must be implemented by subclass');
  }

  /**
   * Setup middleware if needed
   * Override in subclasses
   */
  setupMiddleware(app) {
    return app;
  }

  /**
   * Start server
   * Override in subclasses
   */
  async startServer(app) {
    throw new Error('startServer must be implemented by subclass');
  }

  /**
   * Get adapter summary
   */
  getSummary() {
    return {
      name: this.name,
      status: this.status,
      errors: this.errors.length,
      warnings: this.warnings.length,
      info: this.info.length,
    };
  }
}

export default BaseAdapter;
