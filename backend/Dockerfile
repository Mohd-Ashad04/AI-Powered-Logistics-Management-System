FROM node:22-alpine

WORKDIR /app

# Run as non-root user for security
# Provide ownership of the working directory to the node user
RUN chown -R node:node /app

USER node

# Copy package files first to leverage Docker layer caching
COPY --chown=node:node package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy the rest of the application code
COPY --chown=node:node . .

# Expose the API port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
