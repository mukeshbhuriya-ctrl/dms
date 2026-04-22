FROM node:20-alpine

# Install dependencies for Prisma and other native modules
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy the rest of the application code
COPY . .

# Expose the backend port
EXPOSE 3001

# Start the application
CMD ["node", "server.js"]
