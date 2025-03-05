# Use an official Node.js image
FROM node:18

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json first (for caching purposes)
COPY package*.json ./

# Install dependencies (include dev dependencies for Tailwind)
RUN npm install --include=dev

# Copy the rest of the app
COPY . .

# Build Tailwind styles
RUN npm run build

# Expose port (if needed)
EXPOSE 3000

# Start the app
CMD ["npm", "start"]
