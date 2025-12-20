# Build Stage
FROM node:20-slim AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Production Stage
FROM nginx:alpine

# Install envsubst (might be needed if we used that, but we use shell script)
# RUN apk add --no-cache gettext

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint script
COPY docker/env.sh /docker-entrypoint.d/40-env.sh
RUN chmod +x /docker-entrypoint.d/40-env.sh

# Expose port
EXPOSE 80

# Nginx container automatically runs scripts in /docker-entrypoint.d/
CMD ["nginx", "-g", "daemon off;"]
