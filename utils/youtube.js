const fs = require("fs");
const path = require("path");
const { YtDlp } = require("ytdlp-nodejs");

class YouTubeDownloader {
  static ytdlp; // Shared instance

  /**
   * Initialize the shared yt-dlp instance (call once on bot startup if needed)
   */
  static async init() {
    if (!this.ytdlp) {
      this.ytdlp = new YtDlp({
        // Optional: Set paths if you have custom FFmpeg/binary locations
        // ffmpegPath: '/path/to/ffmpeg',
        // binaryPath: '/path/to/yt-dlp',
      });
    }
    return this.ytdlp;
  }

  /**
   * Get video info using yt-dlp
   */
  static async getVideoInfo(url) {
    try {
      await this.init();
      console.log("🔍 Fetching YouTube video info for:", url);

      const info = await this.ytdlp.getVideoInfoAsync(url);

      if (!info || !info.title) {
        throw new Error("No video info found");
      }

      return {
        title: info.title || "Unknown Title",
        duration: this.formatDuration(info.duration) || "Unknown",
        thumbnail: info.thumbnail?.[0]?.url || "",
        author: info.uploader || "Unknown Channel",
        formats: ["mp4", "mp3"],
        downloadUrl: null, // Not needed anymore
      };
    } catch (error) {
      console.error("❌ YouTube getVideoInfo error:", error.message);
      throw new Error(`Failed to get video info: ${error.message}`);
    }
  }

  /**
   * Download video using yt-dlp
   */
  static async downloadVideo(url) {
    try {
      await this.init();
      console.log("📥 Starting video download...");

      const tempDir = path.join(__dirname, "../temp");
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const outputTemplate = path.join(tempDir, "youtube_%(title)s.%(ext)s");
      const options = {
        output: outputTemplate,
        format: {
          filter: "best[height<=720]", // Best quality up to 720p to keep under 50MB
          quality: "best",
          type: "mp4",
        },
        onProgress: (progress) => {
          console.log(`Progress: ${progress.percent}% (${progress.speed})`);
          // Optional: Send progress to bot chat here if you pass ctx
        },
      };

      const output = await this.ytdlp.downloadAsync(url, options);
      const filepath = output.file; // Path to downloaded file

      if (!fs.existsSync(filepath)) {
        throw new Error("Download file not found");
      }

      return filepath;
    } catch (error) {
      console.error("❌ Video download error:", error.message);
      throw new Error(`Video download failed: ${error.message}`);
    }
  }

  /**
   * Download audio using yt-dlp
   */
  static async downloadAudio(url) {
    try {
      await this.init();
      console.log("🎵 Starting audio download...");

      const tempDir = path.join(__dirname, "../temp");
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const outputTemplate = path.join(tempDir, "youtube_%(title)s.%(ext)s");
      const options = {
        output: outputTemplate,
        format: {
          filter: "bestaudio/best",
          quality: "bestaudio/best",
          type: "mp3", // Extracts to MP3
        },
        onProgress: (progress) => {
          console.log(`Progress: ${progress.percent}% (${progress.speed})`);
          // Optional: Send progress to bot chat here if you pass ctx
        },
      };

      const output = await this.ytdlp.downloadAsync(url, options);
      const filepath = output.file; // Path to downloaded file

      if (!fs.existsSync(filepath)) {
        throw new Error("Download file not found");
      }

      return filepath;
    } catch (error) {
      console.error("❌ Audio download error:", error.message);
      throw new Error(`Audio download failed: ${error.message}`);
    }
  }

  /**
   * Format duration from seconds
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
