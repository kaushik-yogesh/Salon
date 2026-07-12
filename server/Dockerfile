FROM node:18-bullseye-slim

WORKDIR /app

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
