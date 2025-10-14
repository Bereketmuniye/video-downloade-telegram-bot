const { Telegraf } = require("telegraf");
const fs = require("fs");
const path = require("path");
const { URL } = require("url"); // Import URL for robust parsing

const config = require("./config");

// All utility modules must now be present in the ./utils/ folder
const YouTubeDownloader = require("./utils/youtube");
const InstagramDownloader = require("./utils/instagram");
const TikTokDownloader = require("./utils/tiktok");
const TwitterDownloader = require("./utils/twitter");

// Initialize Telegraf Bot with the token from config
const bot = new Telegraf(config.BOT_TOKEN);

/**
 * Utility to safely delete temporary downloaded files.
 * @param {string} filepath - Path to the file to delete.
 */
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

/**
 * Determines the social media platform based on the URL.
 * @param {string} url - The URL string.
 * @returns {string | null} - The platform key (e.g., 'youtube') or null if unsupported.
 */
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

/**
 * Checks if the file size is within Telegram's limit.
 * @param {string} filepath - Path to the file.
 * @returns {boolean} - True if valid, false otherwise.
 */
function isFileSizeValid(filepath) {
    try {
        const stats = fs.statSync(filepath);
        return stats.size <= config.MAX_FILE_SIZE;
    } catch (error) {
        console.error("Error checking file size:", error.message);
        return false;
    }
}

// --- Bot Command Handlers ---

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

*Note:* Large files might not be sent due to Telegram's ${Math.round(config.MAX_FILE_SIZE / config.ONE_MB)}MB limit.
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
• Maximum file size: ${Math.round(config.MAX_FILE_SIZE / config.ONE_MB)}MB
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

*Developer Contact:*
[@champion_chasers](https://t.me/@champion_chasers) - Note: This is a placeholder contact.
    `.trim()
    );
});


// --- URL Processing and Platform Routing ---

bot.on("text", async (ctx) => {
    const message = ctx.message.text.trim();

    if (message.startsWith("/")) return; // Ignore commands

    try {
        const url = new URL(message);
        const platform = getPlatformFromUrl(url.href);

        if (!platform) {
            await ctx.reply(
                "❌ Unsupported platform. I only support: YouTube, Instagram, TikTok, and Twitter."
            );
            return;
        }

        // Route to platform-specific handler
        switch (platform) {
            case config.SUPPORTED_PLATFORMS.YOUTUBE:
                await handleYouTubeUrl(ctx, url.href);
                break;
            case config.SUPPORTED_PLATFORMS.INSTAGRAM:
                await handleInstagramUrl(ctx, url.href);
                break;
            case config.SUPPORTED_PLATFORMS.TIKTOK:
                await handleTikTokUrl(ctx, url.href); // New handler added
                break;
            case config.SUPPORTED_PLATFORMS.TWITTER:
                await handleTwitterUrl(ctx, url.href); // New handler added
                break;
        }
    } catch (error) {
        // If URL parsing fails (e.g., if the message is not a valid URL)
        await ctx.reply(
            "❌ Please send a valid URL from YouTube, Instagram, TikTok, or Twitter."
        );
    }
});


// --- Platform URL Handlers (Initial Analysis) ---

async function handleYouTubeUrl(ctx, url) {
  // ... (Existing YouTube Analysis Logic)
  try {
    await ctx.reply("🔍 Analyzing YouTube video...");

    try {
      // NOTE: This uses the user-provided code which attempts external API first, then ytdl-core.
      const videoInfo = await YouTubeDownloader.getVideoInfo(url);

      // Simple duration formatting
      const durationFormatted = YouTubeDownloader.formatDuration(videoInfo.duration);

      await ctx.replyWithPhoto(
        { url: videoInfo.thumbnail },
        {
          caption: `
📹 *YouTube Video Found*

*Title:* ${videoInfo.title}
*Channel:* ${videoInfo.author}
*Duration:* ${durationFormatted}

Choose format to download:
                    `.trim(),
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "🎥 MP4 Video",
                  callback_data: `youtube_video_${Buffer.from(url).toString(
                    "base64"
                  )}`,
                },
                {
                  text: "🎵 MP3 Audio",
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
          `I found a YouTube video, but I couldn't fetch details.\n\n` +
          `You can still try the download buttons below, which use a different method.\n`,
        {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "🎥 Try MP4 Video (Fallback)",
                            callback_data: `youtube_video_${Buffer.from(url).toString(
                                "base64"
                            )}`,
                        },
                        {
                            text: "🎵 Try MP3 Audio (Fallback)",
                            callback_data: `youtube_audio_${Buffer.from(url).toString(
                                "base64"
                            )}`,
                        },
                    ],
                ],
            }
        }
      );
    }
  } catch (error) {
    await ctx.reply(
      `❌ YouTube Error: Could not analyze the URL. Please check if the video is public and available.`
    );
    console.error("YouTube analysis error:", error);
  }
}

async function handleInstagramUrl(ctx, url) {
    try {
        await ctx.reply("🔍 Analyzing Instagram content...");

        // Note: InstagramDownloader uses placeholder logic for now.
        const mediaInfo = await InstagramDownloader.getMediaInfo(url);

        const caption = mediaInfo.isVideo
            ? `📷 *Instagram Video Found* (Reel/Post)\n\n*Items:* ${mediaInfo.count}`
            : `📷 *Instagram Photo Found* (Post/Story)\n\n*Items:* ${mediaInfo.count}`;

        await ctx.replyWithMarkdown(caption, {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: `📥 Download ${
                                mediaInfo.isVideo ? "Video/Photos" : "Photo/Album"
                            }`,
                            callback_data: `instagram_download_${Buffer.from(
                                url
                            ).toString("base64")}`,
                        },
                    ],
                ],
            },
        });
    } catch (error) {
        await ctx.reply(
            "❌ Error analyzing Instagram content. Please check the URL, ensure the account is *public*, and try again."
        );
        console.error("Instagram analysis error:", error);
    }
}

// FIX: Placeholder for TikTok handler
async function handleTikTokUrl(ctx, url) {
    await ctx.reply("🔍 Analyzing TikTok video...");
    // Since TikTok API is complex, we skip info and jump straight to download attempt
    await ctx.replyWithMarkdown(
        `🎵 *TikTok Video Detected*\n\nChoose download option:`,
        {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "📥 Download Video (No Watermark)",
                            callback_data: `tiktok_download_${Buffer.from(
                                url
                            ).toString("base64")}`,
                        },
                    ],
                ],
            },
        }
    );
}

// FIX: Placeholder for Twitter handler
async function handleTwitterUrl(ctx, url) {
    await ctx.reply("🔍 Analyzing Twitter/X post...");
    // Since Twitter/X API is complex, we skip info and jump straight to download attempt
    await ctx.replyWithMarkdown(
        `🐦 *Twitter/X Post Detected*\n\nChoose download option:`,
        {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "📥 Download Media (Video/Image)",
                            callback_data: `twitter_download_${Buffer.from(
                                url
                            ).toString("base64")}`,
                        },
                    ],
                ],
            },
        }
    );
}


// --- Callback Query Handlers (Download Execution) ---

bot.on("callback_query", async (ctx) => {
    const callbackData = ctx.callbackQuery.data;
    const parts = callbackData.split("_");
    const platform = parts[0];
    const action = parts[1];
    const encodedUrl = parts[parts.length - 1]; // Always the last part
    
    // Check if the callback data is valid before proceeding
    if (!encodedUrl) {
        await ctx.answerCbQuery("Invalid request data.");
        return;
    }

    const url = Buffer.from(encodedUrl, "base64").toString();

    try {
        // Acknowledge the query immediately
        await ctx.answerCbQuery("Processing request...");

        switch (platform) {
            case "youtube":
                // action is 'video' or 'audio'
                await handleYouTubeDownload(ctx, action, url);
                break;
            case "instagram":
                // action is 'download'
                await handleInstagramDownload(ctx, url);
                break;
            case "tiktok":
                // action is 'download'
                await handleTikTokDownload(ctx, url); // New handler added
                break;
            case "twitter":
                // action is 'download'
                await handleTwitterDownload(ctx, url); // New handler added
                break;
            default:
                await ctx.reply("Unknown download platform.");
        }
    } catch (error) {
        console.error("Callback execution error:", error);
        // Ensure the message is edited/deleted even if download fails
        if (ctx.callbackQuery.message) {
             // Try to edit the message to inform the user of the failure
            await ctx.editMessageText("❌ An internal error occurred during processing. Please try again or check the logs.");
        }
    }
});

// --- Platform Download Executors ---

async function handleYouTubeDownload(ctx, format, url) {
    let filepath = null; // Declare outside try/catch for cleanup
    try {
        const messageId = ctx.callbackQuery.message.message_id;
        const chatId = ctx.callbackQuery.message.chat.id;

        await ctx.editMessageText(
            "⏳ Downloading from YouTube... This may take a while for large files."
        );

        const videoInfo = await YouTubeDownloader.getVideoInfo(url);

        if (format === "video") {
            filepath = await YouTubeDownloader.downloadVideo(url);
            await ctx.editMessageText("📤 Sending MP4 video...");

            if (!isFileSizeValid(filepath)) {
                await ctx.reply(
                    "❌ Video file is too large for Telegram (max 50MB). Try audio format instead."
                );
                return;
            }

            await bot.telegram.sendVideo(
                chatId,
                { source: fs.createReadStream(filepath) },
                { caption: `📹 *${videoInfo.title}*`, parse_mode: "Markdown" }
            );
        } else if (format === "audio") {
            filepath = await YouTubeDownloader.downloadAudio(url);
            await ctx.editMessageText("📤 Sending MP3 audio...");

            if (!isFileSizeValid(filepath)) {
                await ctx.reply("❌ Audio file is too large for Telegram.");
                return;
            }

            await bot.telegram.sendAudio(
                chatId,
                { source: fs.createReadStream(filepath) },
                {
                    caption: `🎵 *${videoInfo.title}*`,
                    title: videoInfo.title,
                    performer: videoInfo.author,
                    parse_mode: "Markdown"
                }
            );
        }

        // Delete the loading message if successful
        await ctx.deleteMessage(messageId);

    } catch (error) {
        await ctx.reply("❌ YouTube download failed. The video might be restricted or the API failed. Please try again.");
        console.error("YouTube download error:", error);
    } finally {
        // Ensure file is cleaned up even if sending fails
        if (filepath) {
            cleanupFile(filepath);
        }
    }
}

async function handleInstagramDownload(ctx, url) {
    let files = [];
    try {
        await ctx.editMessageText("⏳ Downloading from Instagram. This may take a few moments...");

        // NOTE: This will throw the 'Not Implemented' error from the placeholder file until you add real logic
        files = await InstagramDownloader.downloadMedia(url);

        for (const filepath of files) {
            if (!isFileSizeValid(filepath)) {
                await ctx.reply(`❌ File ${path.basename(filepath)} is too large for Telegram.`);
                cleanupFile(filepath);
                continue;
            }

            const isVideo = filepath.endsWith(".mp4");
            const stream = fs.createReadStream(filepath);

            if (isVideo) {
                await ctx.replyWithVideo({ source: stream });
            } else {
                await ctx.replyWithPhoto({ source: stream });
            }

            cleanupFile(filepath);
        }

        await ctx.deleteMessage();
        
    } catch (error) {
        await ctx.reply("❌ Instagram download failed. Check if the post is public and available.");
        console.error("Instagram download error:", error);
    } finally {
        files.forEach(cleanupFile);
    }
}

// FIX: Placeholder for TikTok download executor
async function handleTikTokDownload(ctx, url) {
    let filepath = null;
    try {
        await ctx.editMessageText("⏳ Attempting TikTok download...");
        
        // NOTE: This will throw the 'Not Implemented' error from the placeholder file until you add real logic
        filepath = await TikTokDownloader.downloadVideo(url); 

        if (!isFileSizeValid(filepath)) {
            await ctx.reply("❌ Video file is too large for Telegram.");
            return;
        }

        await ctx.editMessageText("📤 Sending TikTok video...");
        await ctx.replyWithVideo({ source: fs.createReadStream(filepath) });
        await ctx.deleteMessage();

    } catch (error) {
        await ctx.reply("❌ TikTok download failed. The downloader service is likely not yet implemented or the URL is invalid.");
        console.error("TikTok download error:", error);
    } finally {
        if (filepath) {
            cleanupFile(filepath);
        }
    }
}

// FIX: Placeholder for Twitter download executor
async function handleTwitterDownload(ctx, url) {
    let files = [];
    try {
        await ctx.editMessageText("⏳ Attempting Twitter/X media download...");
        
        // NOTE: This will throw the 'Not Implemented' error from the placeholder file until you add real logic
        files = await TwitterDownloader.downloadMedia(url); 

        for (const filepath of files) {
            if (!isFileSizeValid(filepath)) {
                await ctx.reply(`❌ File ${path.basename(filepath)} is too large for Telegram.`);
                cleanupFile(filepath);
                continue;
            }

            const isVideo = filepath.endsWith(".mp4");
            const stream = fs.createReadStream(filepath);

            if (isVideo) {
                await ctx.replyWithVideo({ source: stream });
            } else {
                await ctx.replyWithPhoto({ source: stream });
            }

            cleanupFile(filepath);
        }
        await ctx.deleteMessage();

    } catch (error) {
        await ctx.reply("❌ Twitter/X download failed. The downloader service is likely not yet implemented or the URL is invalid.");
        console.error("Twitter download error:", error);
    } finally {
        files.forEach(cleanupFile);
    }
}


// --- Bot Launch and Error Handling ---

bot.catch((err, ctx) => {
    console.error(`Bot error for ${ctx.updateType}:`, err);
    // Attempt to inform the user without crashing
    if (ctx.chat && ctx.chat.type === 'private') {
         ctx.reply("❌ An unexpected bot error occurred. Please try a different URL.");
    }
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
        // Important: If you get an EADDRINUSE error, another process is using the port.
    });

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    // Exit application to prevent unknown state
    process.exit(1); 
});

process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
