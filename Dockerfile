# Use Node.js official image
FROM node:20

# Install FFmpeg (required for video/audio)
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files first (for caching)
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose Telegram bot port if needed (usually not required)
EXPOSE 3000

# Start bot
CMD ["node", "index.js"]
