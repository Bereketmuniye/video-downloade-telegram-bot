const { Downloader } = require("@totallynodavid/downloader");
const fs = require("fs");
const path = require("path");

class TwitterDownloader {
  /**
   * Get media info using external service
   */
  static async getMediaInfo(url) {
    try {
      console.log("🔍 Fetching Twitter media info for:", url);

      const downloader = new Downloader({
        downloadDir: path.join(__dirname, "../temp"),
      });

      const options = { downloadMedia: false };
      const result = await downloader.getMediaInfo(url, options);

      if (!result || !result.urls || result.urls.length === 0) {
        throw new Error("No media found in this Twitter URL");
      }

      const firstUrl = result.urls[0];
      const isVideo =
        firstUrl.format.includes("video") || firstUrl.url.includes(".mp4");
      const type = isVideo ? "Video" : "Photo";

      return {
        urls: result.urls.map((u) => u.url),
        isVideo,
        type,
        count: result.urls.length,
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

      const downloader = new Downloader({
        downloadDir: path.join(__dirname, "../temp"),
      });

      const options = {
        downloadMedia: true,
      };

      const result = await downloader.getMediaInfo(url, options);

      if (!result || !result.urls || result.urls.length === 0) {
        throw new Error("No media downloaded");
      }

      const downloadedFiles = result.urls
        .map((u) => u.localPath)
        .filter((path) => path && fs.existsSync(path));

      if (downloadedFiles.length === 0) {
        throw new Error("No files were successfully downloaded");
      }

      return downloadedFiles;
    } catch (error) {
      console.error("❌ Media download error:", error.message);
      throw new Error(`Media download failed: ${error.message}`);
    }
  }
}

module.exports = TwitterDownloader;
