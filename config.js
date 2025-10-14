// config.js
module.exports = {
  BOT_TOKEN: process.env.BOT_TOKEN,
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB

  SUPPORTED_PLATFORMS: {
    YOUTUBE: "youtube",
    INSTAGRAM: "instagram",
    TIKTOK: "tiktok",
    TWITTER: "twitter",
  },

  URL_PATTERNS: {
    YOUTUBE: /(youtube\.com|youtu\.be)/,
    INSTAGRAM: /(instagram\.com|instagr\.am)/,
    TIKTOK: /(tiktok\.com|vm\.tiktok\.com)/,
    TWITTER: /(twitter\.com|x\.com)/,
  },
};
