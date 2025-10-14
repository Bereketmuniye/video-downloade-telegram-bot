const { fromUrl } = require("instagram-url-direct");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

/**
 * Instagram Downloader Functions
 * Handles posts, reels, and stories from Instagram
 */

class InstagramDownloader {
    /**
     * Get Instagram media information
     * @param {string} url - Instagram URL
     * @returns {Object} Media info
     */
    static async getMediaInfo(url) {
        try {
            const links = await fromUrl(url);

            if (!links || links.length === 0) {
                throw new Error("No media found in this Instagram URL");
            }

            return {
                type: links[0].type || "post",
                urls: links.map((link) => link.url),
                isVideo: links[0].type === "video",
                count: links.length,
            };
        } catch (error) {
            throw new Error(`Instagram download failed: ${error.message}`);
        }
    }

    /**
     * Download Instagram media
     * @param {string} url - Instagram URL
     * @returns {Array} Array of downloaded file paths
     */
    static async downloadMedia(url) {
        try {
            const mediaInfo = await this.getMediaInfo(url);
            const downloadedFiles = [];

            for (let i = 0; i < mediaInfo.urls.length; i++) {
                const mediaUrl = mediaInfo.urls[i];
                const extension = mediaInfo.isVideo ? "mp4" : "jpg";
                const filename = `instagram_${Date.now()}_${i}.${extension}`;
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
            throw new Error(`Instagram download failed: ${error.message}`);
        }
    }
}

module.exports = InstagramDownloader;
