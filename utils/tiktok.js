const axios = require("axios");
const fs = require("fs");
const path = require("path");

class TikTokDownloader {
  /**
   * Get video info using external API
   */
  static async getVideoInfo(url) {
    try {
      console.log("🔍 Fetching TikTok video info for:", url);

      const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(
        url
      )}`;
      const response = await axios.get(apiUrl, {
        timeout: 15000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
      const data = response.data;

      if (data.code === 0 && data.data) {
        return {
          title: data.data.title || "TikTok Video",
          author: data.data.author?.nickname || "Unknown",
          duration: this.formatDuration(data.data.duration || 0),
          thumbnail: data.data.cover || "",
          videoUrl: data.data.play || "",
        };
      } else {
        throw new Error("Failed to get TikTok video info");
      }
    } catch (error) {
      console.error("❌ TikTok getVideoInfo error:", error.message);
      throw new Error(`Failed to get video info: ${error.message}`);
    }
  }

  /**
   * Download video using external service
   */
  static async downloadVideo(url) {
    try {
      console.log("📥 Starting video download via external service...");

      const videoInfo = await this.getVideoInfo(url);

      if (!videoInfo.videoUrl) {
        throw new Error("No download URL available");
      }

      const filename = `tiktok_${Date.now()}.mp4`;
      const filepath = path.join(__dirname, "../temp", filename);

      if (!fs.existsSync(path.join(__dirname, "../temp"))) {
        fs.mkdirSync(path.join(__dirname, "../temp"), { recursive: true });
      }

      const response = await axios({
        method: "GET",
        url: videoInfo.videoUrl,
        responseType: "stream",
        timeout: 300000, // 5 minutes
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Referer: "https://www.tikwm.com/",
        },
      });

      await new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(filepath);
        response.data.pipe(writer);
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      return filepath;
    } catch (error) {
      console.error("❌ Video download error:", error.message);
      throw new Error(`Video download failed: ${error.message}`);
    }
  }

  /**
   * Format duration
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

module.exports = TikTokDownloader;
