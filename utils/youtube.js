const ytdl = require("ytdl-core");
const fs = require("fs");
const path = require("path");

class YouTubeDownloader {
  /**
   * Get video information with better error handling
   */
  static async getVideoInfo(url) {
    try {
      console.log("🔍 Checking YouTube URL:", url);

      // Validate URL first
      if (!ytdl.validateURL(url)) {
        throw new Error("Invalid YouTube URL format");
      }

      // Get video info with updated options
      const info = await ytdl.getInfo(url, {
        lang: "en",
        requestOptions: {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          },
        },
      });

      console.log("✅ YouTube video info fetched successfully");

      // Get the best thumbnail available
      let thumbnail = "";
      if (
        info.videoDetails.thumbnails &&
        info.videoDetails.thumbnails.length > 0
      ) {
        thumbnail =
          info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1]
            .url;
      }

      return {
        title: info.videoDetails.title,
        duration: this.formatDuration(info.videoDetails.lengthSeconds),
        thumbnail: thumbnail,
        author: info.videoDetails.author?.name || "Unknown",
        formats: ["mp4", "mp3"],
      };
    } catch (error) {
      console.error("❌ YouTube getVideoInfo error:", error.message);

      // Provide more specific error messages
      if (error.message.includes("Sign in to confirm you are not a bot")) {
        throw new Error(
          "YouTube is blocking requests. Please try again later."
        );
      } else if (error.message.includes("Video unavailable")) {
        throw new Error("Video is unavailable or private.");
      } else {
        throw new Error(`Failed to get video info: ${error.message}`);
      }
    }
  }

  /**
   * Download video as MP4 with fallback options
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
        try {
          // Try different quality options
          const videoStream = ytdl(url, {
            quality: "highest",
            filter: (format) => format.hasVideo && format.hasAudio,
            requestOptions: {
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              },
            },
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
            reject(new Error(`File write failed: ${error.message}`));
          });

          videoStream.on("error", (error) => {
            console.error("❌ Video stream error:", error);
            reject(new Error(`Video download failed: ${error.message}`));
          });
        } catch (streamError) {
          reject(new Error(`Stream setup failed: ${streamError.message}`));
        }
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
        try {
          const audioStream = ytdl(url, {
            filter: "audioonly",
            quality: "highestaudio",
            requestOptions: {
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              },
            },
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

          writeStream.on("error", (error) => {
            reject(new Error(`File write failed: ${error.message}`));
          });

          audioStream.on("error", (error) => {
            reject(new Error(`Audio download failed: ${error.message}`));
          });
        } catch (streamError) {
          reject(new Error(`Stream setup failed: ${streamError.message}`));
        }
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
      if (isNaN(secs)) return "Unknown";

      const mins = Math.floor(secs / 60);
      const remainingSecs = Math.floor(secs % 60);
      return `${mins}:${remainingSecs.toString().padStart(2, "0")}`;
    } catch (error) {
      return "Unknown";
    }
  }
}

module.exports = YouTubeDownloader;
