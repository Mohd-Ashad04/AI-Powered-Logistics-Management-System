/**
 * @Mohd Ashad
 * 2026-08-12
 * Structured JSON Logger
 * this looks like it is written in production grade form
 */

const formatMessage = (level, message, meta = {}) => {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta
  });
};

const logger = {
  info: (message, meta = {}) => {
    console.log(formatMessage('info', message, meta));
  },
  warn: (message, meta = {}) => {
    console.warn(formatMessage('warn', message, meta));
  },
  error: (message, meta = {}) => {
    if (meta.error && meta.error instanceof Error) {
      meta.error = {
        message: meta.error.message,
        name: meta.error.name,
        code: meta.error.code
        // Stack trace deliberately omitted in production logs unless debug enabled
      };
    }
    console.error(formatMessage('error', message, meta));
  },
  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(formatMessage('debug', message, meta));
    }
  }
};

module.exports = logger;
