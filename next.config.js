// next.config.js

module.exports = {
  webpack: (config) => {
    // Fallback per moduli Node.js non presenti nel browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      child_process: false,
      dns: false,
      timers: false,
    };

    // Alias per import “timers/promises” → false
    if (!config.resolve.alias) config.resolve.alias = {};
    config.resolve.alias['timers/promises'] = false;

    return config;
  },
};