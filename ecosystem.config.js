module.exports = {
  apps: [
    {
      name: 'copy-paste-dev',
      script: 'server.js',
      env: {
        NODE_ENV: 'development',
        PORT: 8080
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true
    },
    {
      name: 'copy-paste-prod',
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 443
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true
    }
  ]
}; 