FROM node:18-bullseye-slim

WORKDIR /app

ENV PYTHON=python3

# Install build dependencies needed for native modules like argon2
RUN apt-get update && apt-get install -y python3 build-essential unzip && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source and prisma
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Expose port
EXPOSE 5000

# Start server
CMD ["npm", "start"]
