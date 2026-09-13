function serializeError(error) {
  if (!error) {
    return undefined;
  }

  return {
    name: error.name,
    message: error.message,
    ...(process.env.NODE_ENV === "production" ? {} : { stack: error.stack })
  };
}

function write(level, message, metadata = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...metadata
  };

  if (process.env.NODE_ENV === "production") {
    console[level === "info" ? "log" : level](JSON.stringify(entry));
    return;
  }

  const details = Object.keys(metadata).length ? metadata : "";
  console[level === "info" ? "log" : level](message, details);
}

export const logger = {
  info(message, metadata) {
    write("info", message, metadata);
  },
  warn(message, metadata) {
    write("warn", message, metadata);
  },
  error(message, metadata = {}) {
    write("error", message, {
      ...metadata,
      ...(metadata.error ? { error: serializeError(metadata.error) } : {})
    });
  }
};
