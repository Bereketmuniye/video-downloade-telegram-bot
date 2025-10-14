const axios = require("axios");
const fs = require("fs");
const path = require("path");

class YouTubeDownloader {
  /**
   * Get video info using external API
   */
  static async getVideoInfo(url) {
    try {
      console.log("🔍 Fetching YouTube video info for:", url);

      // Method 1: Use y2mate API
      try {
        const apiUrl = `https://api.y2mate.guru/api/convert`;
        const response = await axios.post(
          apiUrl,
          {
            url: url,
            format: "mp4",
          },
          {
            timeout: 15000,
            headers: {
              "Content-Type": "application/json",
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
          }
        );

        const data = response.data;
        if (data && data.title) {
          return {
            title: data.title,
            duration: data.duration || "Unknown",
            thumbnail: data.thumb || "",
            author: data.channel || "Unknown Channel",
            formats: ["mp4", "mp3"],
            downloadUrl: data.url || "",
          };
        }
      } catch (apiError) {
        console.log("API method failed, trying alternative...");
      }

      // Method 2: Use noembed for basic info
      try {
        const noembedUrl = `https://noembed.com/embed?url=${encodeURIComponent(
          url
        )}`;
        const response = await axios.get(noembedUrl, { timeout: 10000 });
        const data = response.data;

        if (data && data.title) {
          return {
            title: data.title,
            duration: "Unknown",
            thumbnail: data.thumbnail_url || "",
            author: data.author_name || "Unknown",
            formats: ["mp4", "mp3"],
            downloadUrl: null,
          };
        }
      } catch (noembedError) {
        console.log("Noembed also failed");
      }

      throw new Error("All YouTube API methods failed");
    } catch (error) {
      console.error("❌ YouTube getVideoInfo error:", error.message);
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

      // If we have a direct download URL from the API
      if (videoInfo.downloadUrl) {
        const filename = `youtube_${Date.now()}.mp4`;
        const filepath = path.join(__dirname, "../temp", filename);

        if (!fs.existsSync(path.join(__dirname, "../temp"))) {
          fs.mkdirSync(path.join(__dirname, "../temp"), { recursive: true });
        }

        const response = await axios({
          method: "GET",
          url: videoInfo.downloadUrl,
          responseType: "stream",
          timeout: 300000, // 5 minutes
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        await new Promise((resolve, reject) => {
          const writer = fs.createWriteStream(filepath);
          response.data.pipe(writer);
          writer.on("finish", resolve);
          writer.on("error", reject);
        });

        return filepath;
      }

      // If no direct download URL, use ytdl-core as fallback
      return await this.downloadWithYtdlCore(url, "video");
    } catch (error) {
      console.error("❌ Video download error:", error.message);
      throw new Error(`Video download failed: ${error.message}`);
    }
  }

  /**
   * Download audio using external service
   */
  static async downloadAudio(url) {
    try {
      console.log("🎵 Starting audio download via external service...");

      // Try to get audio download URL from API
      try {
        const apiUrl = `https://api.y2mate.guru/api/convert`;
        const response = await axios.post(
          apiUrl,
          {
            url: url,
            format: "mp3",
          },
          {
            timeout: 15000,
          }
        );

        const data = response.data;
        if (data && data.url) {
          const filename = `youtube_${Date.now()}.mp3`;
          const filepath = path.join(__dirname, "../temp", filename);

          if (!fs.existsSync(path.join(__dirname, "../temp"))) {
            fs.mkdirSync(path.join(__dirname, "../temp"), { recursive: true });
          }

          const audioResponse = await axios({
            method: "GET",
            url: data.url,
            responseType: "stream",
            timeout: 300000,
          });

          await new Promise((resolve, reject) => {
            const writer = fs.createWriteStream(filepath);
            audioResponse.data.pipe(writer);
            writer.on("finish", resolve);
            writer.on("error", reject);
          });

          return filepath;
        }
      } catch (apiError) {
        console.log("Audio API failed, using ytdl-core fallback");
      }

      // Fallback to ytdl-core
      return await this.downloadWithYtdlCore(url, "audio");
    } catch (error) {
      console.error("❌ Audio download error:", error.message);
      throw new Error(`Audio download failed: ${error.message}`);
    }
  }

  /**
   * Fallback method using ytdl-core
   */
  static async downloadWithYtdlCore(url, type) {
    try {
      const ytdl = require("ytdl-core");

      if (!ytdl.validateURL(url)) {
        throw new Error("Invalid YouTube URL");
      }

      const info = await ytdl.getInfo(url);
      const title = info.videoDetails.title.replace(/[^a-zA-Z0-9 ]/g, "");
      const extension = type === "video" ? "mp4" : "mp3";
      const filename = `youtube_${Date.now()}_${title.substring(
        0,
        30
      )}.${extension}`;
      const filepath = path.join(__dirname, "../temp", filename);

      if (!fs.existsSync(path.join(__dirname, "../temp"))) {
        fs.mkdirSync(path.join(__dirname, "../temp"), { recursive: true });
      }

      return new Promise((resolve, reject) => {
        const options =
          type === "video"
            ? { quality: "highest", filter: "audioandvideo" }
            : { filter: "audioonly", quality: "highestaudio" };

        const stream = ytdl(url, options);
        const writeStream = fs.createWriteStream(filepath);

        stream.pipe(writeStream);

        writeStream.on("finish", () => resolve(filepath));
        writeStream.on("error", reject);
        stream.on("error", reject);
      });
    } catch (error) {
      throw new Error(`Fallback download failed: ${error.message}`);
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

module.exports = YouTubeDownloader;
