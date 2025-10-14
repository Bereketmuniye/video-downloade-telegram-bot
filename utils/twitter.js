const { twitter } = require("twitter-url-direct");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const urlModule = require("url");

class TwitterDownloader {
  /**
   * Get media info using external service
   */
  static async getMediaInfo(url) {
    try {
      console.log("🔍 Fetching Twitter media info for:", url);

      const mediaUrls = await twitter(url);

      if (!mediaUrls || mediaUrls.length === 0) {
        throw new Error("No media found in this Twitter URL");
      }

      const isVideo = mediaUrls[0].includes(".mp4");
      const type = isVideo ? "Video" : "Photo";

      return {
        urls: mediaUrls,
        isVideo,
        type,
        count: mediaUrls.length,
      };
    } catch (error) {
      console.error("❌ Twitter getMediaInfo error:", error.message);
      throw new Error(`Failed to get media info: ${error.message}`);
    }
  }

  /**
   * Download media using external service
   */
  static async downloadMedia(url) {
    try {
      console.log("📥 Starting media download via external service...");

      const mediaInfo = await this.getMediaInfo(url);
      const downloadedFiles = [];

      for (let i = 0; i < mediaInfo.urls.length; i++) {
        const mediaUrl = mediaInfo.urls[i];
        const parsedUrl = new urlModule.URL(mediaUrl);
        let ext = path.extname(parsedUrl.pathname);
        if (!ext) {
          ext = mediaUrl.includes(".mp4") ? ".mp4" : ".jpg";
        }
        const filename = `twitter_${Date.now()}_${i}${ext}`;
        const filepath = path.join(__dirname, "../temp", filename);

        if (!fs.existsSync(path.join(__dirname, "../temp"))) {
          fs.mkdirSync(path.join(__dirname, "../temp"), { recursive: true });
        }

        const response = await axios({
          method: "GET",
          url: mediaUrl,
          responseType: "stream",
          timeout: 300000, // 5 minutes
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          },
        });

        await new Promise((resolve, reject) => {
          const writer = fs.createWriteStream(filepath);
          response.data.pipe(writer);
          writer.on("finish", () => {
            console.log(`Downloaded: ${filepath}`);
            resolve();
          });
          writer.on("error", reject);
          response.data.on("error", reject);
        });

        downloadedFiles.push(filepath);
      }

      return downloadedFiles;
    } catch (error) {
      console.error("❌ Media download error:", error.message);
      throw new Error(`Media download failed: ${error.message}`);
    }
  }
}

module.exports = TwitterDownloader;
