const config = {
  development: {
    API_URL: 'http://localhost:3000/api',
  },
  production: {
    API_URL: 'https://156.67.218.186/api', // Sesuaikan dengan domain VPS Anda
  }
};

const env = process.env.NODE_ENV || 'development';
export default config[env]; 