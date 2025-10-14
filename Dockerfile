# Use Node.js image
FROM node:18

# Install Python (required by yt-dlp-exec)
RUN apt-get update && apt-get install -y python3 python3-pip ffmpeg && ln -sf python3 /usr/bin/python

# Set working directory
WORKDIR /app

# Copy package files first for caching
COPY package*.json ./

# Install Node dependencies
RUN npm ci

# Copy the rest of the code
COPY . .

# Expose the port Railway expects
EXPOSE 3000

# Start the bot
CMD ["node", "index.js"]
