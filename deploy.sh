#!/bin/bash

# Frontend build & deploy
echo "Building frontend..."
cd frontend
npm install
npm run build

# Copy frontend build ke direktori nginx
echo "Copying frontend build to nginx directory..."
sudo cp -r build/* /var/www/html/

# Backend deploy
echo "Deploying backend..."
cd ../backend
npm install
pm2 restart server # atau nama proses yang Anda gunakan

echo "Deployment completed!" 