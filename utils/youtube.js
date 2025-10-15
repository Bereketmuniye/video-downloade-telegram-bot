const fs = require("fs");
const path = require("path");
const ytdl = require("ytdl-core");

class YouTubeDownloader {
  constructor(downloadFolder = path.resolve(__dirname, "../downloads")) {
    this.downloadFolder = downloadFolder;

    // Ensure download folder exists
    if (!fs.existsSync(this.downloadFolder)) {
      fs.mkdirSync(this.downloadFolder, { recursive: true });
    }
  }

  /**
   * Get video information
   * @param {string} url - YouTube video URL
   * @returns {Promise<Object>}
   */
  async getVideoInfo(url) {
    const info = await ytdl.getInfo(url);
    return {
      title: info.videoDetails.title,
      author: info.videoDetails.author.name,
      duration: parseInt(info.videoDetails.lengthSeconds),
      thumbnail: info.videoDetails.thumbnails.pop().url,
    };
  }

  /**
   * Format seconds into hh:mm:ss
   * @param {number} seconds
   */
  formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h ? h + ":" : ""}${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  }

  /**
   * Download video in MP4
   * @param {string} url
   * @returns {Promise<string>} - file path
   */
  async downloadVideo(url) {
    const info = await this.getVideoInfo(url);
    const safeTitle = info.title.replace(/[^a-z0-9]/gi, "_");
    const filepath = path.resolve(this.downloadFolder, `${safeTitle}.mp4`);

    return new Promise((resolve, reject) => {
      const stream = ytdl(url, {
        quality: "highestvideo",
        filter: "videoandaudio",
      }).pipe(fs.createWriteStream(filepath));

      stream.on("finish", () => resolve(filepath));
      stream.on("error", (err) => reject(err));
    });
  }

  /**
   * Download audio in MP3
   * @param {string} url
   * @returns {Promise<string>} - file path
   */
  async downloadAudio(url) {
    const info = await this.getVideoInfo(url);
    const safeTitle = info.title.replace(/[^a-z0-9]/gi, "_");
    const filepath = path.resolve(this.downloadFolder, `${safeTitle}.mp3`);

    return new Promise((resolve, reject) => {
      const stream = ytdl(url, { quality: "highestaudio" }).pipe(
        fs.createWriteStream(filepath)
      );

      stream.on("finish", () => resolve(filepath));
      stream.on("error", (err) => reject(err));
    });
  }
}

module.exports = YouTubeDownloader;
