const axios = require("axios");
const fs = require("fs");
const path = require("path");

class TikTokDownloader {
  static async getVideoInfo(url) {
    try {
      const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(
        url
      )}`;
      const response = await axios.get(apiUrl);
      const data = response.data;

      if (data.code === 0 && data.data) {
        return {
          title: data.data.title || "TikTok Video",
          author: data.data.author?.nickname || "Unknown",
          duration: "Unknown",
          thumbnail: `https://www.tikwm.com${data.data.cover}`,
          videoUrl: `https://www.tikwm.com${data.data.play}`,
        };
      } else {
        throw new Error("Failed to get TikTok video info");
      }
    } catch (error) {
      throw new Error(`TikTok download failed: ${error.message}`);
    }
  }

  static async downloadVideo(url) {
    try {
      const videoInfo = await this.getVideoInfo(url);
      const filename = `tiktok_${Date.now()}.mp4`;
      const filepath = path.join(__dirname, "../temp", filename);

      if (!fs.existsSync(path.join(__dirname, "../temp"))) {
        fs.mkdirSync(path.join(__dirname, "../temp"), { recursive: true });
      }

      const response = await axios({
        method: "GET",
        url: videoInfo.videoUrl,
        responseType: "stream",
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
      throw new Error(`TikTok video download failed: ${error.message}`);
    }
  }
}

module.exports = TikTokDownloader;
