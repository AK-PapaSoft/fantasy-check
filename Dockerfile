# Simple single-stage build
FROM node:20-alpine

# Install required packages for Prisma
RUN apk add --no-cache \
    dumb-init \
    openssl \
    openssl-dev

# Create app directory and user
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and config
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Remove dev dependencies
RUN npm ci --only=production && npm cache clean --force

# Change ownership
RUN chown -R nodeuser:nodejs /app

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Expose port
EXPOSE 8080

# Switch to non-root user
USER nodeuser

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/healthz', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]