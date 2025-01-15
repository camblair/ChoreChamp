FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy only necessary files
COPY server.js ./
COPY routes/ ./routes/
COPY models/ ./models/
COPY middleware/ ./middleware/
COPY services/ ./services/

# Expose the port the app runs on
EXPOSE 5050

# Command to run the application
CMD ["node", "server.js"]
