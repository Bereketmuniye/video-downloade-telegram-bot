// utils/instagram.js
const fs = require("fs");
const path = require("path");
const ytdlp = require("yt-dlp-exec").raw;
const glob = require("glob");

const TEMP_DIR = path.join(__dirname, "..", "temp");
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

async function runYtDlp(url, args = {}) {
  return ytdlp(url, args);
}

module.exports = {
  async getMediaInfo(url) {
    try {
      const info = await runYtDlp(url, {
        dump_single_json: true,
        no_warnings: true,
      });
      return {
        type: info.playlist ? "album" : info.extractor || "instagram",
        count: info.entries ? info.entries.length : 1,
        title: info.title || "",
      };
    } catch (err) {
      console.error("Instagram info error:", err);
      return { type: "instagram", count: 1 };
    }
  },

  async downloadMedia(url) {
    const prefix = `insta_${Date.now()}_`;
    const outputTemplate = path.join(TEMP_DIR, prefix + "%(id)s.%(ext)s");
    try {
      await runYtDlp(url, {
        output: outputTemplate,
        format: "best",
        no_warnings: true,
        ignore_errors: true,
      });

      // find downloaded files matching prefix
      const files = glob.sync(path.join(TEMP_DIR, `${prefix}*`));
      return files;
    } catch (err) {
      console.error("Instagram download error:", err);
      throw err;
    }
  },
};
