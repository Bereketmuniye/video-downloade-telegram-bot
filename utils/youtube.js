const fs = require("fs");
const path = require("path");
const ytdl = require("ytdl-core");

class YouTubeDownloader {
  static async getVideoInfo(url) {
    if (!ytdl.validateURL(url)) throw new Error("Invalid YouTube URL");
    const info = await ytdl.getInfo(url);

    return {
      title: info.videoDetails.title,
      author: info.videoDetails.author.name,
      duration: this.formatDuration(info.videoDetails.lengthSeconds),
      thumbnail: info.videoDetails.thumbnails.pop().url,
      formats: ["video", "audio"],
    };
  }

  static async downloadVideo(url) {
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title.replace(/[^a-zA-Z0-9 ]/g, "");
    const filename = `youtube_${Date.now()}_${title.substring(0, 30)}.mp4`;
    const filepath = path.join(__dirname, "../temp", filename);

    if (!fs.existsSync(path.join(__dirname, "../temp"))) {
      fs.mkdirSync(path.join(__dirname, "../temp"), { recursive: true });
    }

    return new Promise((resolve, reject) => {
      ytdl(url, { quality: "highestvideo" })
        .pipe(fs.createWriteStream(filepath))
        .on("finish", () => resolve(filepath))
        .on("error", reject);
    });
  }

  static async downloadAudio(url) {
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title.replace(/[^a-zA-Z0-9 ]/g, "");
    const filename = `youtube_${Date.now()}_${title.substring(0, 30)}.mp3`;
    const filepath = path.join(__dirname, "../temp", filename);

    if (!fs.existsSync(path.join(__dirname, "../temp"))) {
      fs.mkdirSync(path.join(__dirname, "../temp"), { recursive: true });
    }

    return new Promise((resolve, reject) => {
      ytdl(url, { filter: "audioonly", quality: "highestaudio" })
        .pipe(fs.createWriteStream(filepath))
        .on("finish", () => resolve(filepath))
        .on("error", reject);
    });
  }

  static formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }
}

module.exports = YouTubeDownloader;
