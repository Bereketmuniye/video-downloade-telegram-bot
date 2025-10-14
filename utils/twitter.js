const { twitter } = require("twitter-url-direct");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

/**
 * Twitter Downloader Functions
 * Handles Twitter video downloads
 */

class TwitterDownloader {
    /**
     * Get Twitter media information
     * @param {string} url - Twitter URL
     * @returns {Object} Media info
     */
    static async getMediaInfo(url) {
        try {
            const mediaUrls = await twitter(url);

            if (!mediaUrls || mediaUrls.length === 0) {
                throw new Error("No media found in this Twitter URL");
            }

            return {
                urls: mediaUrls,
                isVideo: mediaUrls[0].includes(".mp4"),
                count: mediaUrls.length,
            };
        } catch (error) {
            throw new Error(`Twitter download failed: ${error.message}`);
        }
    }

    /**
     * Download Twitter media
     * @param {string} url - Twitter URL
     * @returns {Array} Array of downloaded file paths
     */
    static async downloadMedia(url) {
        try {
            const mediaInfo = await this.getMediaInfo(url);
            const downloadedFiles = [];

            for (let i = 0; i < mediaInfo.urls.length; i++) {
                const mediaUrl = mediaInfo.urls[i];
                const extension = mediaInfo.isVideo ? "mp4" : "jpg";
                const filename = `twitter_${Date.now()}_${i}.${extension}`;
                const filepath = path.join(__dirname, "../temp", filename);

                // Ensure temp directory exists
                if (!fs.existsSync(path.join(__dirname, "../temp"))) {
                    fs.mkdirSync(path.join(__dirname, "../temp"));
                }

                // Download file
                const response = await axios({
                    method: "GET",
                    url: mediaUrl,
                    responseType: "stream",
                });

                await new Promise((resolve, reject) => {
                    const writer = fs.createWriteStream(filepath);
                    response.data.pipe(writer);
                    writer.on("finish", resolve);
                    writer.on("error", reject);
                });

                downloadedFiles.push(filepath);
            }

            return downloadedFiles;
        } catch (error) {
            throw new Error(`Twitter download failed: ${error.message}`);
        }
    }
}

module.exports = TwitterDownloader;
