module.exports = {
  apps: [
    {
      name: 'elysia-api',
      script: 'dist/index.js',
      cwd: '/opt/elysia-api/current',
      instances: 1,
      autorestart: true,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
