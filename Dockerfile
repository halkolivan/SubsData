# Build stage
FROM node:18-alpine AS build
WORKDIR /app

# Install dependencies for build
COPY package*.json ./
RUN npm install --silent

# Copy sources and build the front-end
COPY . .
RUN npm run build

# Runtime stage
FROM node:18-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Copy built assets and server code
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.js ./server.js
COPY --from=build /app/package*.json ./

# Install only production dependencies required by server (express etc.)
RUN npm install --production --silent

# Expose default port (server reads process.env.PORT)
EXPOSE 10000

# Start the server
CMD ["node", "server.js"]
