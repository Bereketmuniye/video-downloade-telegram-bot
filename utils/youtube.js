const ytdl=require('ytdl-core');
const fs=require('fs');
const path=require('path');


class YouTubeDownloader {
    static async getVideoInfo(url) {
        try {
            if (!ytdl.validateURL(url)) {
                throw new Error("Invalid YouTube URL");
            }
            const info = await ytdl.getInfo(url);
            return {
                title: info.videoDetails.title,
                duration: info.formatDuration(info.videoDetails.lengthSeconds),
                thumbnail: info.videoDetails.thumbnails[0].url,
                author: info.videoDetails.author.name,
            };
        } catch (error) {
            throw new Error("Error fetching video information");
        }
    }

    static async downloadVideo(url, quality = "highest") {
        try {
            const info = await ytdl.getInfo(url);
            const title = info.videoDetails.title.replace(/[^a-zA-Z0-9 ]/g, "");
            const filename = "youtube_${Date.now()}_${title}.mp4";
            const filepath = path.join(__dirname, "../temp", filename);
            if (!fs.existsSync(path.join(__dirname, "../temp"))) {
                fs.mkdirSync(path.join(__dirname, "../temp"));
            }

            return new Promise((resolve, reject) => {
                const videoStream = ytdl(url, {
                    quality: quality,
                });
                const writestream = fs.createWriteStream(filepath);
                videoStream.pipe(writestream);

                writestream.on("finish", () => {
                    resolve(filepath);
                });
                writeStream.on("error", reject);
            });
        } catch (error) {
            throw new Error("Error downloading video");
        }
    }
    static formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    }
}
module.exports = YouTubeDownloader;
