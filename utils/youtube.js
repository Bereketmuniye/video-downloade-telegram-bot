const axios = require("axios");
const fs = require("fs");
const path = require("path");
// Ensure ytdl-core is required only when needed in the fallback method
// const ytdl = require("ytdl-core"); // Moved inside downloadWithYtdlCore

class YouTubeDownloader {
  /**
   * Get video info using external API and ytdl-core fallback
   */
  static async getVideoInfo(url) {
    try {
      console.log("🔍 Fetching YouTube video info for:", url);

      // Method 1: Use y2mate API (User's original logic)
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
            // NOTE: Duration from this API might be formatted string or seconds. We assume seconds here.
            const durationInSeconds = data.duration && !isNaN(data.duration) ? parseInt(data.duration) : "Unknown";

          return {
            title: data.title,
            duration: durationInSeconds, 
            thumbnail: data.thumb || "",
            author: data.channel || "Unknown Channel",
            formats: ["mp4", "mp3"],
            downloadUrl: data.url || "",
          };
        }
      } catch (apiError) {
        console.log("API method failed, trying ytdl-core info...");
      }

      // Method 2: Use ytdl-core for robust info extraction
      try {
        const ytdl = require("ytdl-core");
        if (!ytdl.validateURL(url)) {
            throw new Error("Invalid YouTube URL for ytdl-core");
        }
        const info = await ytdl.getInfo(url);
        
        // Clean title for display
        const title = info.videoDetails.title;
        const duration = parseInt(info.videoDetails.lengthSeconds);

        return {
            title: title,
            duration: isNaN(duration) ? "Unknown" : duration,
            thumbnail: info.videoDetails.thumbnails.slice(-1)[0].url || "", // Get highest resolution thumbnail
            author: info.videoDetails.author?.name || "Unknown",
            formats: ["mp4", "mp3"],
            downloadUrl: null, // ytdl handles the stream directly
        };

      } catch (ytdlError) {
          console.log("ytdl-core info also failed:", ytdlError.message);
      }

      throw new Error("All YouTube API methods failed to get info.");
    } catch (error) {
      console.error("❌ YouTube getVideoInfo error:", error.message);
      // Re-throw the error to be handled by the calling function
      throw new Error(`Failed to get video info: ${error.message}`);
    }
  }

  /**
   * Download video using external service or ytdl-core fallback
   * Downloads highest quality MP4 video stream.
   */
  static async downloadVideo(url) {
    // We rely mostly on the ytdl-core fallback for reliability
    try {
        return await this.downloadWithYtdlCore(url, "video");
    } catch (error) {
        console.error("❌ Video download failed, even with fallback:", error.message);
        throw new Error(`Video download failed: ${error.message}`);
    }
  }

  /**
   * Download audio using external service or ytdl-core fallback
   * Downloads highest quality MP3 audio stream.
   */
  static async downloadAudio(url) {
    // We rely mostly on the ytdl-core fallback for reliability
    try {
        return await this.downloadWithYtdlCore(url, "audio");
    } catch (error) {
        console.error("❌ Audio download failed, even with fallback:", error.message);
        throw new Error(`Audio download failed: ${error.message}`);
    }
  }

  /**
   * Fallback method using ytdl-core for streams.
   */
  static async downloadWithYtdlCore(url, type) {
    try {
      const ytdl = require("ytdl-core");

      if (!ytdl.validateURL(url)) {
        throw new Error("Invalid YouTube URL");
      }

      // Get video info to determine filename
      const info = await ytdl.getInfo(url);
      
      // Sanitize title for filename
      const rawTitle = info.videoDetails.title;
      const title = rawTitle.replace(/[^a-zA-Z0-9\s-]/g, "").substring(0, 30).trim();

      const extension = type === "video" ? "mp4" : "mp3";
      const filename = `${title || 'youtube_media'}_${Date.now()}.${extension}`;
      
      // IMPORTANT: Use temporary folder path relative to project root
      const tempDir = path.join(__dirname, "../temp"); 
      const filepath = path.join(tempDir, filename);

      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      return new Promise((resolve, reject) => {
        let options;
        if (type === "video") {
             // 18 is 720p/360p mp4 stream with audio (common reliable format)
             options = { quality: "highestvideo", filter: "audioandvideo" }; 
        } else {
             options = { filter: "audioonly", quality: "highestaudio" };
        }
        
        console.log(`Starting ytdl-core stream download (${type})...`);
        const stream = ytdl(url, options);
        const writeStream = fs.createWriteStream(filepath);

        stream.pipe(writeStream);

        writeStream.on("finish", () => {
             console.log(`Successfully downloaded: ${filepath}`);
             resolve(filepath)
        });
        writeStream.on("error", (err) => {
            console.error("WriteStream error:", err);
            reject(new Error(`File write error: ${err.message}`));
        });
        stream.on("error", (err) => {
            console.error("Ytdl-core stream error:", err);
            reject(new Error(`Ytdl stream error: ${err.message}`));
        });

      });
    } catch (error) {
      throw new Error(`Fallback download failed: ${error.message}`);
    }
  }

  /**
   * Format duration from seconds to MM:SS or HH:MM:SS
   * @param {number|string} totalSeconds - Duration in seconds.
   */
  static formatDuration(totalSeconds) {
    try {
      const secs = parseInt(totalSeconds);
      if (isNaN(secs)) return "Unknown";

      const hours = Math.floor(secs / 3600);
      const minutes = Math.floor((secs % 3600) / 60);
      const seconds = Math.floor(secs % 60);

      const parts = [];
      if (hours > 0) {
          parts.push(hours.toString());
      }
      parts.push(minutes.toString().padStart(hours > 0 ? 2 : 1, '0'));
      parts.push(seconds.toString().padStart(2, '0'));
      
      return parts.join(':');

    } catch (error) {
      return "Unknown";
    }
  }
}

module.exports = YouTubeDownloader;
