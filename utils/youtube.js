// utils/youtube.js
const fs = require("fs");
const path = require("path");
const ytdlp = require("yt-dlp-exec").raw;
const ytdlCore = (() => {
  try {
    return require("ytdl-core");
  } catch (e) {
    return null;
  }
})();

const TEMP_DIR = path.join(__dirname, "..", "temp");
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

function safeFilename(s) {
  return s.replace(/[^a-z0-9_\-\.]/gi, "_");
}

async function runYtDlp(url, args) {
  // uses the raw function from yt-dlp-exec which returns a promise
  return ytdlp(url, args);
}

module.exports = {
  async getVideoInfo(url) {
    try {
      const info = await runYtDlp(url, {
        dump_single_json: true,
        no_warnings: true,
        prefer_free_formats: true,
        no_check_certificate: true,
      });
      // info is parsed JSON object
      return {
        title: info.title || "Unknown",
        duration:
          typeof info.duration === "number"
            ? `${Math.floor(info.duration / 60)}:${String(
                info.duration % 60
              ).padStart(2, "0")}`
            : "Unknown",
        thumbnail: info.thumbnail || "",
        author: info.uploader || info.uploader_id || "Unknown",
        formats: ["mp4", "mp3"],
      };
    } catch (err) {
      console.error(
        "getVideoInfo yt-dlp failed:",
        err && err.message ? err.message : err
      );
      // as fallback, try ytdl-core for metadata
      if (ytdlCore && ytdlCore.validateURL(url)) {
        try {
          const info = await ytdlCore.getInfo(url);
          return {
            title: info.videoDetails.title,
            duration: null,
            thumbnail: info.videoDetails.thumbnail?.[0]?.url || "",
            author: info.videoDetails.author?.name || "Unknown",
            formats: ["mp4", "mp3"],
          };
        } catch (e) {
          /* fall through */
        }
      }
      throw err;
    }
  },

  async downloadVideo(url) {
    const filename = `youtube_${Date.now()}.mp4`;
    const filepath = path.join(TEMP_DIR, filename);

    try {
      await runYtDlp(url, {
        output: filepath,
        format: "mp4[ext=mp4]/bestvideo+bestaudio/best",
        ignore_errors: true,
      });
      // yt-dlp will append extension; ensure we pick the file with mp4 extension
      const found = fs
        .readdirSync(TEMP_DIR)
        .find((f) => f.startsWith(`youtube_`) && f.endsWith(".mp4"));
      if (found) return path.join(TEMP_DIR, found);
      // if not found, return filepath (maybe yt-dlp wrote same name)
      return filepath;
    } catch (err) {
      console.error(
        "downloadVideo yt-dlp failed:",
        err && err.message ? err.message : err
      );
      // fallback to ytdl-core
      if (ytdlCore && ytdlCore.validateURL(url)) {
        const info = await ytdlCore.getInfo(url);
        const title = safeFilename(info.videoDetails.title).substring(0, 100);
        const out = path.join(TEMP_DIR, `youtube_${Date.now()}_${title}.mp4`);
        await new Promise((resolve, reject) => {
          const stream = ytdlCore(url, { quality: "highestvideo" });
          const ws = fs.createWriteStream(out);
          stream.pipe(ws);
          ws.on("finish", resolve);
          ws.on("error", reject);
          stream.on("error", reject);
        });
        return out;
      }
      throw err;
    }
  },

  async downloadAudio(url) {
    const filename = `youtube_${Date.now()}.mp3`;
    const filepath = path.join(TEMP_DIR, filename);

    try {
      await runYtDlp(url, {
        extract_audio: true,
        audio_format: "mp3",
        output: filepath,
        prefer_free_formats: true,
        ignore_errors: true,
      });
      // pick the produced mp3
      const found = fs
        .readdirSync(TEMP_DIR)
        .find(
          (f) =>
            f.startsWith("youtube_") &&
            (f.endsWith(".mp3") || f.endsWith(".m4a") || f.endsWith(".opus"))
        );
      if (found) return path.join(TEMP_DIR, found);
      return filepath;
    } catch (err) {
      console.error(
        "downloadAudio yt-dlp failed:",
        err && err.message ? err.message : err
      );
      // fallback: use ytdl-core to extract audio
      if (ytdlCore && ytdlCore.validateURL(url)) {
        const info = await ytdlCore.getInfo(url);
        const title = safeFilename(info.videoDetails.title).substring(0, 100);
        const out = path.join(TEMP_DIR, `youtube_${Date.now()}_${title}.mp3`);
        await new Promise((resolve, reject) => {
          const stream = ytdlCore(url, {
            filter: "audioonly",
            quality: "highestaudio",
          });
          const ffmpeg = require("child_process").spawn("ffmpeg", [
            "-i",
            "pipe:0",
            "-f",
            "mp3",
            "-ab",
            "192000",
            "-vn",
            out,
          ]);
          stream.pipe(ffmpeg.stdin);
          ffmpeg.on("close", (code) => {
            if (code === 0) resolve();
            else reject(new Error("ffmpeg failed"));
          });
          ffmpeg.on("error", reject);
          stream.on("error", reject);
        });
        return out;
      }
      throw err;
    }
  },
};
