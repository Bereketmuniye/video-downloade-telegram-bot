const ytdl = require("ytdl-core");
const fs = require("fs");
const path = require("path");

class YouTubeDownloader {
  /**
   * Get video information
   */
  static async getVideoInfo(url) {
    try {
      console.log("🔍 Checking YouTube URL:", url);

      if (!ytdl.validateURL(url)) {
        throw new Error("Invalid YouTube URL");
      }

      const info = await ytdl.getInfo(url);
      console.log("✅ YouTube video info fetched successfully");

      return {
        title: info.videoDetails.title,
        duration: this.formatDuration(info.videoDetails.lengthSeconds),
        thumbnail:
          info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1]
            .url,
        author: info.videoDetails.author.name,
        formats: ["mp4", "mp3"],
      };
    } catch (error) {
      console.error("❌ YouTube getVideoInfo error:", error.message);
      throw new Error(`Failed to get video info: ${error.message}`);
    }
  }

  /**
   * Download video as MP4
   */
  static async downloadVideo(url) {
    try {
      console.log("📥 Starting YouTube video download...");

      const info = await ytdl.getInfo(url);
      const title = info.videoDetails.title.replace(/[^a-zA-Z0-9 ]/g, "");
      const filename = `youtube_${Date.now()}_${title.substring(0, 30)}.mp4`;
      const filepath = path.join(__dirname, "../temp", filename);

      // Ensure temp directory exists
      if (!fs.existsSync(path.join(__dirname, "../temp"))) {
        fs.mkdirSync(path.join(__dirname, "../temp"), { recursive: true });
      }

      return new Promise((resolve, reject) => {
        const videoStream = ytdl(url, {
          quality: "highest",
          filter: "audioandvideo",
        });

        const writeStream = fs.createWriteStream(filepath);

        videoStream.pipe(writeStream);

        videoStream.on("progress", (chunkLength, downloaded, total) => {
          const percent = ((downloaded / total) * 100).toFixed(2);
          console.log(`📥 Download progress: ${percent}%`);
        });

        writeStream.on("finish", () => {
          console.log("✅ Video download completed:", filepath);
          resolve(filepath);
        });

        writeStream.on("error", (error) => {
          console.error("❌ Write stream error:", error);
          reject(error);
        });

        videoStream.on("error", (error) => {
          console.error("❌ Video stream error:", error);
          reject(error);
        });
      });
    } catch (error) {
      console.error("❌ YouTube downloadVideo error:", error.message);
      throw new Error(`Video download failed: ${error.message}`);
    }
  }

  /**
   * Download audio as MP3
   */
  static async downloadAudio(url) {
    try {
      console.log("🎵 Starting YouTube audio download...");

      const info = await ytdl.getInfo(url);
      const title = info.videoDetails.title.replace(/[^a-zA-Z0-9 ]/g, "");
      const filename = `youtube_${Date.now()}_${title.substring(0, 30)}.mp3`;
      const filepath = path.join(__dirname, "../temp", filename);

      // Ensure temp directory exists
      if (!fs.existsSync(path.join(__dirname, "../temp"))) {
        fs.mkdirSync(path.join(__dirname, "../temp"), { recursive: true });
      }

      return new Promise((resolve, reject) => {
        const audioStream = ytdl(url, {
          filter: "audioonly",
          quality: "highestaudio",
        });

        const writeStream = fs.createWriteStream(filepath);

        audioStream.pipe(writeStream);

        audioStream.on("progress", (chunkLength, downloaded, total) => {
          const percent = ((downloaded / total) * 100).toFixed(2);
          console.log(`🎵 Audio download progress: ${percent}%`);
        });

        writeStream.on("finish", () => {
          console.log("✅ Audio download completed:", filepath);
          resolve(filepath);
        });

        writeStream.on("error", reject);
        audioStream.on("error", reject);
      });
    } catch (error) {
      console.error("❌ YouTube downloadAudio error:", error.message);
      throw new Error(`Audio download failed: ${error.message}`);
    }
  }

  /**
   * Format duration from seconds to MM:SS
   */
  static formatDuration(seconds) {
    try {
      const secs = parseInt(seconds);
      const mins = Math.floor(secs / 60);
      const remainingSecs = Math.floor(secs % 60);
      return `${mins}:${remainingSecs.toString().padStart(2, "0")}`;
    } catch (error) {
      return "Unknown";
    }
  }
}

module.exports = YouTubeDownloader;
