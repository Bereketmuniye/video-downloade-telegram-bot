const ytdl = require("ytdl-core");

class YouTubeDownloader {
  static async getVideoInfo(url) {
    try {
      const info = await ytdl.getInfo(url);
      return {
        title: info.videoDetails.title,
        author: info.videoDetails.author.name,
        duration: info.videoDetails.lengthSeconds,
        thumbnail: info.videoDetails.thumbnails.pop().url,
      };
    } catch (err) {
      console.error("ytdl-core error:", err);
      throw err;
    }
  }

  static formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  static async downloadVideo(url) {
    const filepath = `./temp/${Date.now()}.mp4`;
    await new Promise((resolve, reject) => {
      ytdl(url, { quality: "highestvideo" })
        .pipe(fs.createWriteStream(filepath))
        .on("finish", resolve)
        .on("error", reject);
    });
    return filepath;
  }

  static async downloadAudio(url) {
    const filepath = `./temp/${Date.now()}.mp3`;
    await new Promise((resolve, reject) => {
      ytdl(url, { filter: "audioonly" })
        .pipe(fs.createWriteStream(filepath))
        .on("finish", resolve)
        .on("error", reject);
    });
    return filepath;
  }
}

module.exports = YouTubeDownloader;
