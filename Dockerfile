FROM node:18-slim

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl

# Install dependencies first (for better caching)
COPY package*.json ./
RUN npm install

# Copy the entire application
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Make entrypoint script executable
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Build the TypeScript code
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Set entrypoint for migrations
ENTRYPOINT ["docker-entrypoint.sh"]

# Command to run the application
CMD ["npm", "start"] 