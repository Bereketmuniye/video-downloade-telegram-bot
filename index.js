const { Telegraf } = require("telegraf");
const fs = require("fs");
const path = require("path");

const config = require("./config");

const YouTubeDownloader = require("./utils/youtube");
const InstagramDownloader = require("./utils/instagram");
// const TikTokDownloader = require("./utils/tiktok");
// const TwitterDownloader = require("./utils/twitter");

const bot = new Telegraf(config.BOT_TOKEN);

const userStates = new Map();

function cleanupFile(filepath) {
    try {
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
            console.log(`Cleaned up: ${filepath}`);
        }
    } catch (error) {
        console.error("Cleanup error:", error);
    }
}

function getPlatformFromUrl(url) {
    if (config.URL_PATTERNS.YOUTUBE.test(url))
        return config.SUPPORTED_PLATFORMS.YOUTUBE;
    if (config.URL_PATTERNS.INSTAGRAM.test(url))
        return config.SUPPORTED_PLATFORMS.INSTAGRAM;
    if (config.URL_PATTERNS.TIKTOK.test(url))
        return config.SUPPORTED_PLATFORMS.TIKTOK;
    if (config.URL_PATTERNS.TWITTER.test(url))
        return config.SUPPORTED_PLATFORMS.TWITTER;
    return null;
}

function isFileSizeValid(filepath) {
    try {
        const stats = fs.statSync(filepath);
        return stats.size <= config.MAX_FILE_SIZE;
    } catch (error) {
        return false;
    }
}

bot.start(async (ctx) => {
    const welcomeMessage = `
🎬 *Social Media Downloader Bot* 🎬

I can download media from:
• 📹 YouTube (Video & Audio)
• 📷 Instagram (Posts, Reels, Stories)
• 🎵 TikTok (Videos without watermark)
• 🐦 Twitter/X (Videos & Images)

*How to use:*
1. Send me a URL from any supported platform
2. Choose download options
3. Wait for your media!

*Supported Platforms:*
${Object.values(config.SUPPORTED_PLATFORMS)
    .map(
        (platform) =>
            `• ${platform.charAt(0).toUpperCase() + platform.slice(1)}`
    )
    .join("\n")}

*Commands:*
/start - Show this message
/help - Get help
/support - Get support information

*Note:* Some large files might not be sent due to Telegram's 50MB limit.
    `.trim();

    await ctx.replyWithMarkdown(welcomeMessage);
});

bot.help(async (ctx) => {
    const helpMessage = `
🆘 *How to Use This Bot* 🆘

*Download Steps:*
1. Copy URL from supported platform
2. Send URL to this bot
3. Follow the instructions

*URL Examples:*
• YouTube: https://youtube.com/watch?v=...
• Instagram: https://instagram.com/p/...
• TikTok: https://tiktok.com/@user/video/...
• Twitter: https://twitter.com/user/status/...

*File Limits:*
• Maximum file size: 50MB
• Videos longer than 1 hour might fail
• Private/restricted content cannot be downloaded

*Need Help?*
Use /support to contact the developer
    `.trim();

    await ctx.replyWithMarkdown(helpMessage);
});

bot.command("support", (ctx) => {
    ctx.replyWithMarkdown(
        `
💬 *Support Information*

If you encounter any issues:
1. Make sure the URL is correct and public
2. Check if the content is available in your region
3. Try again after some time

*Common Issues:*
• Private accounts cannot be downloaded
• Region-restricted content might fail
• Very large files exceed Telegram limits

*Developer Contact:*
[@YourUsername](https://t.me/YourUsername)
    `.trim()
    );
});

bot.on("text", async (ctx) => {
    const message = ctx.message.text.trim();
    const userId = ctx.from.id;

    if (message.startsWith("/")) return;

    try {
        const url = new URL(message);
        const platform = getPlatformFromUrl(url.href);

        if (!platform) {
            await ctx.reply(
                "❌ Unsupported platform. I only support: YouTube, Instagram, TikTok, and Twitter."
            );
            return;
        }

        userStates.set(userId, { platform, url: url.href });

        switch (platform) {
            case config.SUPPORTED_PLATFORMS.YOUTUBE:
                await handleYouTubeUrl(ctx, url.href);
                break;

            case config.SUPPORTED_PLATFORMS.INSTAGRAM:
                await handleInstagramUrl(ctx, url.href);
                break;

            case config.SUPPORTED_PLATFORMS.TIKTOK:
                await handleTikTokUrl(ctx, url.href);
                break;

            case config.SUPPORTED_PLATFORMS.TWITTER:
                await handleTwitterUrl(ctx, url.href);
                break;
        }
    } catch (error) {
        await ctx.reply(
            "❌ Please send a valid URL from YouTube, Instagram, TikTok, or Twitter."
        );
    }
});

async function handleYouTubeUrl(ctx, url) {
  try {
    await ctx.reply("🔍 Analyzing YouTube video...");

    try {
      const videoInfo = await YouTubeDownloader.getVideoInfo(url);

      await ctx.replyWithPhoto(
        { url: videoInfo.thumbnail },
        {
          caption: `
📹 *YouTube Video Found*

*Title:* ${videoInfo.title}
*Channel:* ${videoInfo.author}
*Duration:* ${videoInfo.duration}

⚠️ *Note:* YouTube downloads are currently limited due to API changes. We're working on a fix.

Choose format to try:
                    `.trim(),
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "🎥 Try MP4 Video",
                  callback_data: `youtube_video_${Buffer.from(url).toString(
                    "base64"
                  )}`,
                },
                {
                  text: "🎵 Try MP3 Audio",
                  callback_data: `youtube_audio_${Buffer.from(url).toString(
                    "base64"
                  )}`,
                },
              ],
            ],
          },
        }
      );
    } catch (infoError) {
      // If getting info fails, show a helpful message
      await ctx.reply(
        `📹 *YouTube Video Detected*\n\n` +
          `I found a YouTube video, but currently facing technical issues due to YouTube's recent changes.\n\n` +
          `🔧 *What's happening:*\n` +
          `• YouTube updated their API\n` +
          `• Download tools need updates\n` +
          `• Working on a solution\n\n` +
          `Try other platforms like TikTok or Twitter for now!`,
        { parse_mode: "Markdown" }
      );
    }
  } catch (error) {
    await ctx.reply(
      `❌ YouTube Error\n\n` +
        `Currently experiencing issues with YouTube downloads. ` +
        `This is a known issue we're working to fix.\n\n` +
        `Try other social media platforms in the meantime!`
    );
    console.error("YouTube error:", error);
  }
}
async function handleInstagramUrl(ctx, url) {
    try {
        await ctx.reply("🔍 Analyzing Instagram content...");

        const mediaInfo = await InstagramDownloader.getMediaInfo(url);

        const caption = mediaInfo.isVideo
            ? `📷 Instagram Video Found\n\n*Type:* ${mediaInfo.type}\n*Items:* ${mediaInfo.count}`
            : `📷 Instagram Photo Found\n\n*Type:* ${mediaInfo.type}\n*Items:* ${mediaInfo.count}`;

        await ctx.replyWithMarkdown(caption, {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: `📥 Download ${
                                mediaInfo.isVideo ? "Video" : "Photo"
                            }`,
                            callback_data: `instagram_${Buffer.from(
                                url
                            ).toString("base64")}`,
                        },
                    ],
                ],
            },
        });
    } catch (error) {
        await ctx.reply(
            "❌ Error analyzing Instagram content. Please check the URL and try again."
        );
        console.error("Instagram error:", error);
    }
}

bot.on("callback_query", async (ctx) => {
    const callbackData = ctx.callbackQuery.data;
    const [platform, action, encodedUrl] = callbackData.split("_");
    const url = Buffer.from(encodedUrl, "base64").toString();
    const chatId = ctx.callbackQuery.message.chat.id;

    try {
        await ctx.answerCbQuery();

        switch (platform) {
            case "youtube":
                await handleYouTubeDownload(ctx, action, url);
                break;
            case "instagram":
                await handleInstagramDownload(ctx, url);
                break;
            case "tiktok":
                await handleTikTokDownload(ctx, url);
                break;
            case "twitter":
                await handleTwitterDownload(ctx, url);
                break;
        }
    } catch (error) {
        console.error("Callback error:", error);
        await ctx.reply("❌ An error occurred. Please try again.");
    }
});

async function handleYouTubeDownload(ctx, format, url) {
    try {
        await ctx.editMessageText(
            "⏳ Downloading from YouTube... This may take a while."
        );

        let filepath;
        const videoInfo = await YouTubeDownloader.getVideoInfo(url);

        if (format === "video") {
            filepath = await YouTubeDownloader.downloadVideo(url);
            await ctx.editMessageText("📤 Sending video...");

            if (!isFileSizeValid(filepath)) {
                await ctx.reply(
                    "❌ Video file is too large for Telegram (max 50MB). Try audio format instead."
                );
                cleanupFile(filepath);
                return;
            }

            await ctx.replyWithVideo(
                { source: fs.createReadStream(filepath) },
                { caption: `📹 ${videoInfo.title}` }
            );
        } else if (format === "audio") {
            filepath = await YouTubeDownloader.downloadAudio(url);
            await ctx.editMessageText("📤 Sending audio...");

            if (!isFileSizeValid(filepath)) {
                await ctx.reply("❌ Audio file is too large for Telegram.");
                cleanupFile(filepath);
                return;
            }

            await ctx.replyWithAudio(
                { source: fs.createReadStream(filepath) },
                {
                    caption: `🎵 ${videoInfo.title}`,
                    title: videoInfo.title,
                    performer: videoInfo.author,
                }
            );
        }

        await ctx.deleteMessage();
        cleanupFile(filepath);
    } catch (error) {
        await ctx.reply("❌ Download failed. Please try again.");
        console.error("YouTube download error:", error);
    }
}

async function handleInstagramDownload(ctx, url) {
    try {
        await ctx.editMessageText("⏳ Downloading from Instagram...");

        const files = await InstagramDownloader.downloadMedia(url);

        for (const filepath of files) {
            if (!isFileSizeValid(filepath)) {
                await ctx.reply("❌ File is too large for Telegram.");
                cleanupFile(filepath);
                continue;
            }

            const isVideo = filepath.endsWith(".mp4");

            if (isVideo) {
                await ctx.replyWithVideo({
                    source: fs.createReadStream(filepath),
                });
            } else {
                await ctx.replyWithPhoto({
                    source: fs.createReadStream(filepath),
                });
            }

            cleanupFile(filepath);
        }

        await ctx.deleteMessage();
    } catch (error) {
        await ctx.reply("❌ Instagram download failed. Please try again.");
        console.error("Instagram download error:", error);
    }
}

async function handleTikTokDownload(ctx, url) {
    try {
        await ctx.editMessageText("⏳ Downloading from TikTok...");

        const filepath = await TikTokDownloader.downloadVideo(url);

        if (!isFileSizeValid(filepath)) {
            await ctx.reply("❌ Video file is too large for Telegram.");
            cleanupFile(filepath);
            return;
        }

        await ctx.replyWithVideo({ source: fs.createReadStream(filepath) });
        await ctx.deleteMessage();
        cleanupFile(filepath);
    } catch (error) {
        await ctx.reply("❌ TikTok download failed. Please try again.");
        console.error("TikTok download error:", error);
    }
}

async function handleTwitterDownload(ctx, url) {
    try {
        await ctx.editMessageText("⏳ Downloading from Twitter...");

        const files = await TwitterDownloader.downloadMedia(url);

        for (const filepath of files) {
            if (!isFileSizeValid(filepath)) {
                await ctx.reply("❌ File is too large for Telegram.");
                cleanupFile(filepath);
                continue;
            }

            const isVideo = filepath.endsWith(".mp4");

            if (isVideo) {
                await ctx.replyWithVideo({
                    source: fs.createReadStream(filepath),
                });
            } else {
                await ctx.replyWithPhoto({
                    source: fs.createReadStream(filepath),
                });
            }

            cleanupFile(filepath);
        }

        await ctx.deleteMessage();
    } catch (error) {
        await ctx.reply("❌ Twitter download failed. Please try again.");
        console.error("Twitter download error:", error);
    }
}

bot.catch((err, ctx) => {
    console.error("Bot error:", err);
    ctx.reply("❌ An unexpected error occurred. Please try again.");
});

console.log("🚀 Starting Social Media Downloader Bot...");
bot.launch()
    .then(() => {
        console.log("✅ Bot is running successfully!");
        console.log(
            "📋 Supported platforms: YouTube, Instagram, TikTok, Twitter"
        );
    })
    .catch((err) => {
        console.error("❌ Failed to start bot:", err);
    });

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
