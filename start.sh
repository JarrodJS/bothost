#!/bin/sh
# Run database migrations
npx prisma db push

# Start the application
node server.js
