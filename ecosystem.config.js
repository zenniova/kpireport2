module.exports = {
  apps: [{
    name: "kpi-report-backend",
    script: "./backend/src/server.js",
    instances: "max",
    exec_mode: "cluster",
    env: {
      NODE_ENV: "development",
    },
    env_production: {
      NODE_ENV: "production",
    }
  }]
} 