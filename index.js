// index.js
const { Telegraf } = require("telegraf");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const config = require("./config");

// Downloader classes
const YouTubeDownloader = require("./utils/youtube");
const InstagramDownloader = require("./utils/instagram");
const TikTokDownloader = require("./utils/tiktok");
const TwitterDownloader = require("./utils/twitter");

// Initialize bot
const bot = new Telegraf(config.BOT_TOKEN);

// --- Utility Functions ---

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

function isFileSizeValid(filepath) {
  try {
    const stats = fs.statSync(filepath);
    return stats.size <= config.MAX_FILE_SIZE;
  } catch (error) {
    console.error("Error checking file size:", error.message);
    return false;
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

// --- Bot Commands ---

bot.start(async (ctx) => {
  const welcome = `
🎬 *Social Media Downloader Bot* 🎬

I can download media from:
• 📹 YouTube
• 📷 Instagram
• 🎵 TikTok
• 🐦 Twitter/X

Send a URL from any supported platform and choose download options.

*Commands:*
/start - Show this message
/help - How to use
/support - Developer info

*Note:* Large files may not be sent due to Telegram's ${Math.round(
    config.MAX_FILE_SIZE / config.ONE_MB
  )}MB limit.
  `.trim();

  await ctx.replyWithMarkdown(welcome);
});

bot.help(async (ctx) => {
  const helpMessage = `
🆘 *How to Use This Bot* 🆘

1. Copy a URL from a supported platform.
2. Send the URL to the bot.
3. Follow instructions and choose download format.

*Supported Platforms Example URLs:*
• YouTube: https://youtube.com/watch?v=...
• Instagram: https://instagram.com/p/...
• TikTok: https://tiktok.com/@user/video/...
• Twitter/X: https://twitter.com/user/status/...

*File Limits:* Max ${Math.round(config.MAX_FILE_SIZE / config.ONE_MB)}MB.
  `.trim();

  await ctx.replyWithMarkdown(helpMessage);
});

bot.command("support", (ctx) => {
  ctx.replyWithMarkdown(
    `
💬 *Support Information*

Ensure the URL is public and correct.  
Try again later if content is unavailable.

*Developer Contact:* [Telegram](https://t.me/@champion_chasers)
  `.trim()
  );
});

// --- URL Processing ---

bot.on("text", async (ctx) => {
  const message = ctx.message.text.trim();
  if (message.startsWith("/")) return;

  try {
    const url = new URL(message);
    const platform = getPlatformFromUrl(url.href);
    if (!platform) {
      await ctx.reply(
        "❌ Unsupported platform. I only support YouTube, Instagram, TikTok, and Twitter."
      );
      return;
    }

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
  } catch {
    await ctx.reply(
      "❌ Please send a valid URL from YouTube, Instagram, TikTok, or Twitter."
    );
  }
});

// --- Platform URL Handlers ---

async function handleYouTubeUrl(ctx, url) {
  try {
    await ctx.reply("🔍 Analyzing YouTube video...");
    const videoInfo = await YouTubeDownloader.getVideoInfo(url);
    const durationFormatted = YouTubeDownloader.formatDuration(
      videoInfo.duration
    );

    await ctx.replyWithPhoto(
      { url: videoInfo.thumbnail },
      {
        caption: `
📹 *YouTube Video*

*Title:* ${videoInfo.title}
*Channel:* ${videoInfo.author}
*Duration:* ${durationFormatted}

Choose download format:
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
  } catch (error) {
    await ctx.reply(
      "❌ Could not analyze YouTube video. The video might be private or unavailable."
    );
    console.error("YouTube analysis error:", error);
  }
}

async function handleInstagramUrl(ctx, url) {
  await ctx.reply("🔍 Analyzing Instagram content...");
  const mediaInfo = await InstagramDownloader.getMediaInfo(url);
  const caption = mediaInfo.isVideo
    ? `📷 *Instagram Video Found* (${mediaInfo.count} items)`
    : `📷 *Instagram Photo Found* (${mediaInfo.count} items)`;

  await ctx.replyWithMarkdown(caption, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: `📥 Download ${
              mediaInfo.isVideo ? "Video/Photos" : "Photo/Album"
            }`,
            callback_data: `instagram_download_${Buffer.from(url).toString(
              "base64"
            )}`,
          },
        ],
      ],
    },
  });
}

async function handleTikTokUrl(ctx, url) {
  await ctx.replyWithMarkdown(
    `🎵 *TikTok Video Detected*\n\nChoose download option:`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "📥 Download Video (No Watermark)",
              callback_data: `tiktok_download_${Buffer.from(url).toString(
                "base64"
              )}`,
            },
          ],
        ],
      },
    }
  );
}

async function handleTwitterUrl(ctx, url) {
  await ctx.replyWithMarkdown(
    `🐦 *Twitter/X Post Detected*\n\nChoose download option:`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "📥 Download Media",
              callback_data: `twitter_download_${Buffer.from(url).toString(
                "base64"
              )}`,
            },
          ],
        ],
      },
    }
  );
}

// --- Callback Query Handlers ---

bot.on("callback_query", async (ctx) => {
  const callbackData = ctx.callbackQuery.data;
  const parts = callbackData.split("_");
  const platform = parts[0];
  const action = parts[1];
  const encodedUrl = parts[parts.length - 1];
  if (!encodedUrl) return await ctx.answerCbQuery("Invalid request.");

  const url = Buffer.from(encodedUrl, "base64").toString();
  await ctx.answerCbQuery("Processing request...");

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
    default:
      await ctx.reply("❌ Unknown platform.");
  }
});

// --- Download Executors ---

async function handleYouTubeDownload(ctx, format, url) {
  let filepath = null;
  try {
    await ctx.editMessageText("⏳ Downloading YouTube media...");
    const videoInfo = await YouTubeDownloader.getVideoInfo(url);

    if (format === "video")
      filepath = await YouTubeDownloader.downloadVideo(url);
    if (format === "audio")
      filepath = await YouTubeDownloader.downloadAudio(url);

    if (!isFileSizeValid(filepath)) {
      await ctx.reply("❌ File too large for Telegram.");
      return;
    }

    const stream = fs.createReadStream(filepath);
    if (format === "video")
      await ctx.replyWithVideo(
        { source: stream },
        { caption: videoInfo.title }
      );
    if (format === "audio")
      await ctx.replyWithAudio(
        { source: stream },
        { caption: videoInfo.title }
      );
  } catch (error) {
    console.error("YouTube download error:", error);
    await ctx.reply("❌ Failed to download YouTube media.");
  } finally {
    if (filepath) cleanupFile(filepath);
  }
}

async function handleInstagramDownload(ctx, url) {
  let files = [];
  try {
    await ctx.editMessageText("⏳ Downloading Instagram media...");
    files = await InstagramDownloader.downloadMedia(url);

    for (const file of files) {
      if (!isFileSizeValid(file)) continue;
      const stream = fs.createReadStream(file);
      if (file.endsWith(".mp4")) await ctx.replyWithVideo({ source: stream });
      else await ctx.replyWithPhoto({ source: stream });
      cleanupFile(file);
    }
  } catch (error) {
    console.error("Instagram download error:", error);
    await ctx.reply("❌ Instagram download failed.");
  }
}

async function handleTikTokDownload(ctx, url) {
  let filepath = null;
  try {
    await ctx.editMessageText("⏳ Downloading TikTok video...");
    filepath = await TikTokDownloader.downloadVideo(url);
    if (!isFileSizeValid(filepath)) {
      await ctx.reply("❌ File too large.");
      return;
    }
    await ctx.replyWithVideo({ source: fs.createReadStream(filepath) });
  } catch (error) {
    console.error("TikTok download error:", error);
    await ctx.reply("❌ TikTok download failed.");
  } finally {
    if (filepath) cleanupFile(filepath);
  }
}

async function handleTwitterDownload(ctx, url) {
  let files = [];
  try {
    await ctx.editMessageText("⏳ Downloading Twitter media...");
    files = await TwitterDownloader.downloadMedia(url);

    for (const file of files) {
      if (!isFileSizeValid(file)) continue;
      const stream = fs.createReadStream(file);
      if (file.endsWith(".mp4")) await ctx.replyWithVideo({ source: stream });
      else await ctx.replyWithPhoto({ source: stream });
      cleanupFile(file);
    }
  } catch (error) {
    console.error("Twitter download error:", error);
    await ctx.reply("❌ Twitter download failed.");
  }
}

// --- Bot Launch ---

bot.catch((err, ctx) => {
  console.error(`Bot error:`, err);
  if (ctx.chat) ctx.reply("❌ An unexpected error occurred.");
});

console.log("🚀 Starting Social Media Downloader Bot...");
bot.launch().then(() => console.log("✅ Bot is running"));

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
