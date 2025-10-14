// index.js
require("dotenv").config();
const { Telegraf } = require("telegraf");
const fs = require("fs");
const path = require("path");
const glob = require("glob");

const config = require("./config");

const YouTube = require("./utils/youtube");
const Instagram = require("./utils/instagram");
const TikTok = require("./utils/tiktok");
const Twitter = require("./utils/twitter");

const bot = new Telegraf(config.BOT_TOKEN);

const TEMP_DIR = path.join(__dirname, "temp");
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

function cleanupFile(filepath) {
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      console.log("Cleaned up:", filepath);
    }
  } catch (err) {
    console.error("Cleanup error:", err);
  }
}

function isFileSizeValid(filepath) {
  try {
    const stats = fs.statSync(filepath);
    return stats.size <= config.MAX_FILE_SIZE;
  } catch (err) {
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

bot.start((ctx) => {
  const msg = `🎬 Social Media Downloader Bot
Send a public YouTube / Instagram / TikTok / Twitter link and I'll try to download it (under 50MB to send via Telegram).`;
  return ctx.reply(msg);
});

bot.help((ctx) => {
  return ctx.reply("Send a supported URL and choose the available options.");
});

bot.on("text", async (ctx) => {
  const text = ctx.message.text?.trim();
  if (!text || text.startsWith("/")) return;

  let url = text;
  try {
    // make sure it's a valid URL string
    // allow user to paste bare links
    const parsed = new URL(url);
    url = parsed.href;
  } catch (err) {
    return ctx.reply("❌ Please send a valid URL.");
  }

  const platform = getPlatformFromUrl(url);
  if (!platform) {
    return ctx.reply(
      "❌ Unsupported platform. Supported: YouTube, Instagram, TikTok, Twitter/X"
    );
  }

  try {
    if (platform === config.SUPPORTED_PLATFORMS.YOUTUBE) {
      await ctx.reply("🔍 Analyzing YouTube video...");
      try {
        const info = await YouTube.getVideoInfo(url);
        const caption = `📹 ${info.title}\nChannel: ${info.author}\nDuration: ${
          info.duration || "Unknown"
        }`;
        await ctx.replyWithPhoto(
          { url: info.thumbnail || "" },
          {
            caption,
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "🎥 Download Video (MP4)",
                    callback_data: `youtube_video_${Buffer.from(url).toString(
                      "base64"
                    )}`,
                  },
                  {
                    text: "🎵 Download Audio (MP3)",
                    callback_data: `youtube_audio_${Buffer.from(url).toString(
                      "base64"
                    )}`,
                  },
                ],
              ],
            },
          }
        );
      } catch (err) {
        console.error("YouTube analyse error:", err);
        await ctx.reply(
          "📹 YouTube detected but can't fetch details right now. Try download button or try again later."
        );
      }
    } else if (platform === config.SUPPORTED_PLATFORMS.INSTAGRAM) {
      await ctx.reply("🔍 Analyzing Instagram content...");
      const info = await Instagram.getMediaInfo(url);
      await ctx.reply(
        `📷 Instagram: ${info.type || "media"} — items: ${info.count || 1}`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "📥 Download",
                  callback_data: `instagram_dl_${Buffer.from(url).toString(
                    "base64"
                  )}`,
                },
              ],
            ],
          },
        }
      );
    } else if (platform === config.SUPPORTED_PLATFORMS.TIKTOK) {
      await ctx.reply("🔍 Analyzing TikTok...");
      await ctx.reply("🎵 TikTok detected", {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📥 Download",
                callback_data: `tiktok_dl_${Buffer.from(url).toString(
                  "base64"
                )}`,
              },
            ],
          ],
        },
      });
    } else if (platform === config.SUPPORTED_PLATFORMS.TWITTER) {
      await ctx.reply("🔍 Analyzing Twitter/X...");
      await ctx.reply("🐦 Twitter/X detected", {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📥 Download",
                callback_data: `twitter_dl_${Buffer.from(url).toString(
                  "base64"
                )}`,
              },
            ],
          ],
        },
      });
    }
  } catch (err) {
    console.error("Processing url error:", err);
    await ctx.reply("❌ Failed to process URL. Try again later.");
  }
});

bot.on("callback_query", async (ctx) => {
  const data = ctx.callbackQuery.data;
  const [platform, action, encoded] = data.split("_");
  const url = Buffer.from(encoded, "base64").toString();
  const messageId = ctx.callbackQuery.message.message_id;

  try {
    await ctx.answerCbQuery();

    if (platform === "youtube") {
      await ctx.editMessageText("⏳ Downloading from YouTube...");
      try {
        let filepath;
        if (action === "video") {
          filepath = await YouTube.downloadVideo(url);
        } else {
          filepath = await YouTube.downloadAudio(url);
        }

        if (!filepath || !fs.existsSync(filepath)) {
          throw new Error("No file produced");
        }

        if (!isFileSizeValid(filepath)) {
          await ctx.reply(
            "❌ File too large for Telegram (50MB). I will not send it."
          );
          cleanupFile(filepath);
          return;
        }

        if (filepath.endsWith(".mp4")) {
          await ctx.replyWithVideo({ source: fs.createReadStream(filepath) });
        } else if (filepath.endsWith(".mp3") || filepath.endsWith(".m4a")) {
          await ctx.replyWithAudio({ source: fs.createReadStream(filepath) });
        } else {
          // fallback to document
          await ctx.replyWithDocument({
            source: fs.createReadStream(filepath),
          });
        }

        cleanupFile(filepath);
        try {
          await ctx.deleteMessage(messageId);
        } catch (e) {}
      } catch (err) {
        console.error("YouTube download error:", err);
        await ctx.reply("❌ Failed to download YouTube video. See logs.");
      }
    }

    if (platform === "instagram") {
      await ctx.editMessageText("⏳ Downloading from Instagram...");
      try {
        const files = await Instagram.downloadMedia(url);
        if (!files || files.length === 0)
          throw new Error("No files downloaded");
        for (const f of files) {
          if (!isFileSizeValid(f)) {
            await ctx.reply("❌ File too large to send via Telegram.");
            cleanupFile(f);
            continue;
          }
          if (f.endsWith(".mp4")) {
            await ctx.replyWithVideo({ source: fs.createReadStream(f) });
          } else {
            await ctx.replyWithPhoto({ source: fs.createReadStream(f) });
          }
          cleanupFile(f);
        }
        try {
          await ctx.deleteMessage(messageId);
        } catch (e) {}
      } catch (err) {
        console.error("Instagram download error:", err);
        await ctx.reply("❌ Instagram download failed.");
      }
    }

    if (platform === "tiktok") {
      await ctx.editMessageText("⏳ Downloading from TikTok...");
      try {
        const files = await TikTok.downloadMedia(url);
        if (!files || files.length === 0) throw new Error("No files");
        for (const f of files) {
          if (!isFileSizeValid(f)) {
            await ctx.reply("❌ File too large.");
            cleanupFile(f);
            continue;
          }
          await ctx.replyWithVideo({ source: fs.createReadStream(f) });
          cleanupFile(f);
        }
        try {
          await ctx.deleteMessage(messageId);
        } catch (e) {}
      } catch (err) {
        console.error("TikTok download error:", err);
        await ctx.reply("❌ TikTok download failed.");
      }
    }

    if (platform === "twitter") {
      await ctx.editMessageText("⏳ Downloading from Twitter/X...");
      try {
        const files = await Twitter.downloadMedia(url);
        if (!files || files.length === 0) throw new Error("No files");
        for (const f of files) {
          if (!isFileSizeValid(f)) {
            await ctx.reply("❌ File too large.");
            cleanupFile(f);
            continue;
          }
          if (f.endsWith(".mp4")) {
            await ctx.replyWithVideo({ source: fs.createReadStream(f) });
          } else {
            await ctx.replyWithPhoto({ source: fs.createReadStream(f) });
          }
          cleanupFile(f);
        }
        try {
          await ctx.deleteMessage(messageId);
        } catch (e) {}
      } catch (err) {
        console.error("Twitter download error:", err);
        await ctx.reply("❌ Twitter download failed.");
      }
    }
  } catch (err) {
    console.error("Callback handling error:", err);
    await ctx.reply("❌ An error occurred while processing your request.");
  }
});

bot.catch((err, ctx) => {
  console.error("Bot error:", err);
});

bot.launch().then(() => {
  console.log("Bot started");
});

// graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
