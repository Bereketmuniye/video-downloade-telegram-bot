// utils/twitter.js
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
  async downloadMedia(url) {
    const prefix = `twitter_${Date.now()}_`;
    const outputTemplate = path.join(TEMP_DIR, prefix + "%(id)s.%(ext)s");
    try {
      await runYtDlp(url, {
        output: outputTemplate,
        format: "best",
        no_warnings: true,
        ignore_errors: true,
      });

      const files = glob.sync(path.join(TEMP_DIR, `${prefix}*`));
      return files;
    } catch (err) {
      console.error("Twitter download error:", err);
      throw err;
    }
  },

  async getInfo(url) {
    try {
      const info = await runYtDlp(url, {
        dump_single_json: true,
        no_warnings: true,
      });
      return info;
    } catch (err) {
      console.error("Twitter info error:", err);
      return null;
    }
  },
};
