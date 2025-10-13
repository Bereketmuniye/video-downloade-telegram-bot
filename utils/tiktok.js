const { TiktokDL } = require("tiktok-v2");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

/**
 * TikTok Downloader Functions
 * Handles TikTok videos without watermark
 */

class TikTokDownloader {
    /**
     * Get TikTok video information
     * @param {string} url - TikTok URL
     * @returns {Object} Video info
     */
    static async getVideoInfo(url) {
        try {
            const result = await TiktokDL(url);

            if (!result || !result.result) {
                throw new Error("Failed to get TikTok video info");
            }

            const videoInfo = result.result;

            return {
                title: videoInfo.description || "TikTok Video",
                author: videoInfo.author.nickname,
                duration: videoInfo.duration || "Unknown",
                thumbnail: videoInfo.cover,
                videoUrl: videoInfo.video1 || videoInfo.video2,
                music: videoInfo.music_info
                    ? videoInfo.music_info.title
                    : "Original Sound",
            };
        } catch (error) {
            throw new Error(`TikTok download failed: ${error.message}`);
        }
    }

    /**
     * Download TikTok video
     * @param {string} url - TikTok URL
     * @returns {string} Path to downloaded file
     */
    static async downloadVideo(url) {
        try {
            const videoInfo = await this.getVideoInfo(url);
            const filename = `tiktok_${Date.now()}.mp4`;
            const filepath = path.join(__dirname, "../temp", filename);

            // Ensure temp directory exists
            if (!fs.existsSync(path.join(__dirname, "../temp"))) {
                fs.mkdirSync(path.join(__dirname, "../temp"));
            }

            // Download video
            const response = await axios({
                method: "GET",
                url: videoInfo.videoUrl,
                responseType: "stream",
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
