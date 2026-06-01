import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Serve custom user uploaded files statically under /uploads in both dev and production
  const uploadRootDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadRootDir)) {
    fs.mkdirSync(uploadRootDir, { recursive: true });
  }
  app.use("/uploads", express.static(uploadRootDir));

  // Multer storage setup targeting specific raid IDs
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const { raidId } = req.params;
      const raidDir = path.join(uploadRootDir, raidId);
      if (!fs.existsSync(raidDir)) {
        fs.mkdirSync(raidDir, { recursive: true });
      }
      cb(null, raidDir);
    },
    filename: (req, file, cb) => {
      cb(null, "custom_tools.zip");
    }
  });

  const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 } // Generous 50MB limit
  });

  // API Route - Upload custom ZIP files for a raid
  app.post("/api/raids/:raidId/upload-tools", upload.single("file"), (req: express.Request, res: express.Response) => {
    const { raidId } = req.params;
    if (!req.file) {
      return res.status(400).json({ error: "Missing uploaded file. Make sure field name is 'file'." });
    }
    return res.json({
      success: true,
      fileUrl: `/uploads/${raidId}/custom_tools.zip`,
      fileName: req.file.originalname
    });
  });

  // API Route - Create Discord Bot Thread
  app.post("/api/discord/create-thread", async (req: express.Request, res: express.Response) => {
    const { botToken, channelId, title, message } = req.body;

    if (!botToken) {
      return res.status(400).json({ error: "Missing botToken" });
    }
    if (!channelId) {
      return res.status(400).json({ error: "Missing channelId" });
    }
    if (!title || !message) {
      return res.status(400).json({ error: "Missing title or message" });
    }

    try {
      // Clean bot token (remove whitespace or "Bot " prefix if user added it)
      const cleanToken = botToken.trim().replace(/^Bot\s+/i, '');

      // Probe channel type to determine correct Discord API strategy
      let channelType = 0; // Default to Text Channel
      try {
        const channelRes = await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
          headers: {
            "Authorization": `Bot ${cleanToken}`
          }
        });
        if (channelRes.ok) {
          const channelInfo = (await channelRes.json()) as any;
          channelType = channelInfo.type;
        }
      } catch (err) {
        console.warn("Could not probe channel type, will try fallbacks:", err);
      }

      let threadId = "";
      if (channelType === 15) {
        // Forum channel - must create thread passing the starter message in the body
        const resThread = await fetch(`https://discord.com/api/v10/channels/${channelId}/threads`, {
          method: "POST",
          headers: {
            "Authorization": `Bot ${cleanToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: title,
            auto_archive_duration: 1440,
            message: {
              content: message
            }
          })
        });

        if (!resThread.ok) {
          const detail = await resThread.text();
          throw new Error(`Forum thread creation failed (${resThread.status}): ${detail}`);
        }

        const threadObj = (await resThread.json()) as any;
        threadId = threadObj.id;
      } else {
        // Text/announcement channel - try to create thread first, fallback to forum format on error
        const resThread = await fetch(`https://discord.com/api/v10/channels/${channelId}/threads`, {
          method: "POST",
          headers: {
            "Authorization": `Bot ${cleanToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: title,
            auto_archive_duration: 1440,
            type: 11 // GUILD_PUBLIC_THREAD
          })
        });

        if (!resThread.ok) {
          const errorText = await resThread.text();
          // If error implies it is a forum or message is required
          if (resThread.status === 400 && (errorText.includes("message") || errorText.includes("forum"))) {
            const fallbackRes = await fetch(`https://discord.com/api/v10/channels/${channelId}/threads`, {
              method: "POST",
              headers: {
                "Authorization": `Bot ${cleanToken}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                name: title,
                auto_archive_duration: 1440,
                message: {
                  content: message
                }
              })
            });
            if (!fallbackRes.ok) {
              const fallbackDetail = await fallbackRes.text();
              throw new Error(`Fallback thread creation failed: ${fallbackDetail}`);
            }
            const threadObj = (await fallbackRes.json()) as any;
            threadId = threadObj.id;
          } else {
            throw new Error(`Standard thread creation failed (${resThread.status}): ${errorText}`);
          }
        } else {
          const threadObj = (await resThread.json()) as any;
          threadId = threadObj.id;

          // Now send the first starting message inside the newly created thread
          const resMsg = await fetch(`https://discord.com/api/v10/channels/${threadId}/messages`, {
            method: "POST",
            headers: {
              "Authorization": `Bot ${cleanToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              content: message
            })
          });

          if (!resMsg.ok) {
            const msgError = await resMsg.text();
            throw new Error(`Sending starter message failed: ${msgError}`);
          }
        }
      }

      return res.json({ success: true, threadId });
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ error: error.message || "Failed to create Discord thread" });
    }
  });

  // API Route - Report Issue to Discord Webhook
  app.post("/api/discord/report-issue", async (req: express.Request, res: express.Response) => {
    const { webhookUrl, title, description, severity, reporterIgn, reporterJob, reporterLevel, reporterDiscordId, reporterDiscordUsername, pageUrl } = req.body;

    if (!webhookUrl) {
      return res.status(400).json({ error: "Missing webhookUrl" });
    }
    if (!description) {
      return res.status(400).json({ error: "Missing issue description" });
    }

    try {
      let embedColor = 3447003; // Suggestion Blue
      let severityLabel = "🔵 優化與建議";
      if (severity === "blocker") {
        embedColor = 15158332; // Blocker Red
        severityLabel = "🔴 嚴重阻礙 (Blocker)";
      } else if (severity === "bug") {
        embedColor = 15105570; // Bug Orange
        severityLabel = "🟡 功能異常 (Bug)";
      }

      const reporterInfo = reporterIgn 
        ? `🎮 IGN: **${reporterIgn}** (${reporterJob || '未知'} Lv.${reporterLevel || 120})`
        : "🎮 客人 / 未登入身分";

      const discordInfo = reporterDiscordId 
        ? `🤖 Discord: <@${reporterDiscordId}> (${reporterDiscordUsername || '未知'})`
        : "🤖 Discord: 未登錄/未連動";

      const fields = [
        { name: "📋 狀況描述", value: description.substring(0, 1024), inline: false },
        { name: "⚠️ 嚴重程度", value: severityLabel, inline: true },
        { name: "👤 回報成員", value: `${reporterInfo}\n${discordInfo}`, inline: false }
      ];

      if (pageUrl) {
        fields.push({ name: "🔗 來源網址", value: pageUrl, inline: true });
      }

      const payload = {
        embeds: [
          {
            title: title ? `🐛 網頁問題/建議回報：${title.substring(0, 250)}` : "🐛 收到新的 NyxShade 網頁問題或建議回報！",
            color: embedColor,
            fields,
            timestamp: new Date().toISOString(),
            footer: {
              text: "NyxShade Expedition System Bug Tracker"
            }
          }
        ]
      };

      const discRes = await fetch(webhookUrl.trim(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!discRes.ok) {
        const errorText = await discRes.text();
        throw new Error(`Discord Webhook returned status ${discRes.status}: ${errorText}`);
      }

      return res.json({ success: true });
    } catch (error: any) {
      console.error("Failed to report issue to Discord Webhook:", error);
      return res.status(500).json({ error: error.message || "Failed to deliver report to Discord" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
