FROM node:20-alpine

# Install dependencies for Prisma and other native modules
RUN apk add --no-cache openssl

WORKDIR /app

# Create directory for uploads
RUN mkdir -p /app/data

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

RUN npx prisma generate

# Expose the backend port
EXPOSE 3001

# Start the application
CMD ["node", "server.js"]
