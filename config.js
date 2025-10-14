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
         YOUTUBE: /youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/shorts\//i,
    INSTAGRAM: /instagram\.com\/(p|reels|stories)\//i,
    TIKTOK: /tiktok\.com\//i,
    TWITTER: /(twitter|x)\.com\/\w+\/status\/\d+/i,
    },
};

