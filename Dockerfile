FROM node:20

# Install FFmpeg (needed for video/audio)
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

CMD ["node", "index.js"]
