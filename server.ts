import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import fs from "fs";
import { verifyKey } from "discord-interactions";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    }
  }));

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

  // API Route - Post Interactive Discord Card (with Buttons for Discord Signup)
  app.post("/api/discord/post-interactive-card", async (req: express.Request, res: express.Response) => {
    const { botToken, channelId, raidId, title, bossName, targetCount, currentCount, leaderName, partyMembersSummary, customNote, appUrl } = req.body;

    if (!botToken || !channelId) {
      return res.status(400).json({ error: "Missing botToken or channelId" });
    }

    try {
      const cleanToken = botToken.trim().replace(/^Bot\s+/i, '');
      const raidKey = raidId || "default_raid";

      const noteSection = customNote ? `\n\n📌 **隊長叮嚀**：\n> ${customNote.replace(/\n/g, '\n> ')}` : '';

      const embed = {
        title: title || `⚔️ 【${bossName || '遠征隊'}】 隊伍招募中！`,
        description: `**隊長**：${leaderName || '冒險者'}\n**招募進度**：\`${currentCount || 0} / ${targetCount || 12} 人\`${noteSection}\n\n**小隊陣容資訊**：\n${partyMembersSummary || '尚無隊員錄取，歡迎點擊下方按鈕直接報名！'}\n\n👇 **點擊下方按鈕即可直接在 Discord 上報名/切換職業！**`,
        color: 5814783, // Royal Indigo
        timestamp: new Date().toISOString(),
        footer: {
          text: `NyxShade Expedition System • Raid ID: ${raidKey}`
        }
      };

      const components = [
        {
          type: 1, // ACTION_ROW
          components: [
            {
              type: 2, // BUTTON
              style: 1, // Primary (Blue)
              custom_id: `party_signup_${raidKey}`,
              label: "🙋 快速報名 / 變更職業",
              emoji: { name: "🙋" }
            },
            {
              type: 2, // BUTTON
              style: 4, // Danger (Red)
              custom_id: `party_cancel_${raidKey}`,
              label: "❌ 取消報名",
              emoji: { name: "❌" }
            },
            {
              type: 2, // BUTTON
              style: 2, // Secondary (Gray)
              custom_id: `party_status_${raidKey}`,
              label: "📋 隊伍現況",
              emoji: { name: "📋" }
            }
          ]
        }
      ];

      const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bot ${cleanToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          embeds: [embed],
          components
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Discord API returned ${response.status}: ${errorText}`);
      }

      const msgData = await response.json() as any;
      return res.json({ success: true, messageId: msgData.id });
    } catch (error: any) {
      console.error("Failed to post interactive card to Discord:", error);
      return res.status(500).json({ error: error.message || "Failed to post interactive card" });
    }
  });

  // In-memory & on-disk store for Discord public key & signups
  const discordSignupsStore: Record<string, any[]> = {};
  const keyFilePath = path.join(uploadRootDir, "discord_key.txt");
  let serverDiscordPublicKey = process.env.DISCORD_PUBLIC_KEY || "";

  if (!serverDiscordPublicKey && fs.existsSync(keyFilePath)) {
    try {
      serverDiscordPublicKey = fs.readFileSync(keyFilePath, "utf-8").trim();
    } catch (e) {
      console.warn("Failed to read discord_key.txt", e);
    }
  }

  // API Route - Set Discord Public Key dynamically from Admin Console
  app.post("/api/discord/set-public-key", (req: express.Request, res: express.Response) => {
    const { publicKey } = req.body;
    if (typeof publicKey === "string") {
      serverDiscordPublicKey = publicKey.trim();
      try {
        fs.writeFileSync(keyFilePath, serverDiscordPublicKey, "utf-8");
      } catch (err) {
        console.error("Failed to write discord_key.txt", err);
      }
      console.log(`[Discord] Public Key updated on server (${serverDiscordPublicKey.length} chars, prefix: ${serverDiscordPublicKey.slice(0, 6)}...)`);
      return res.json({ success: true, message: "Discord Public Key updated on server", keyLength: serverDiscordPublicKey.length });
    }
    return res.status(400).json({ error: "Invalid publicKey string" });
  });

  // API Route - Get Discord Public Key status
  app.get("/api/discord/public-key-status", (_req: express.Request, res: express.Response) => {
    return res.json({
      configured: Boolean(serverDiscordPublicKey),
      keyLength: serverDiscordPublicKey.length,
      keyPrefix: serverDiscordPublicKey ? `${serverDiscordPublicKey.slice(0, 6)}...` : ""
    });
  });

  // API Route - Query Signups for a party (Client Web App can sync this)
  app.get("/api/discord/signups/:raidId", (req: express.Request, res: express.Response) => {
    const { raidId } = req.params;
    return res.json({ signups: discordSignupsStore[raidId] || [] });
  });

  // API Route - Discord Interactions Webhook Endpoint
  app.post("/api/discord/interactions", async (req: express.Request, res: express.Response) => {
    const signature = req.get("X-Signature-Ed25519");
    const timestamp = req.get("X-Signature-Timestamp");
    const publicKey = (serverDiscordPublicKey || process.env.DISCORD_PUBLIC_KEY || "").trim();

    if (!publicKey) {
      console.warn("[Discord Interactions] Received request but no Discord Public Key configured on server.");
      return res.status(401).send("Discord Public Key not configured");
    }

    if (!signature || !timestamp || !(req as any).rawBody) {
      console.warn("[Discord Interactions] Missing signature or timestamp headers.");
      return res.status(401).send("Missing signature headers");
    }

    try {
      const isValid = await verifyKey((req as any).rawBody, signature, timestamp, publicKey);
      if (!isValid) {
        console.warn(`[Discord Interactions] Invalid signature with key prefix: ${publicKey.slice(0, 6)}...`);
        return res.status(401).send("Bad request signature");
      }
    } catch (err) {
      console.error("[Discord Interactions] Signature verification exception:", err);
      return res.status(401).send("Bad request signature");
    }

    const interaction = req.body;

    if (!interaction) {
      return res.status(400).send("Bad request");
    }

    // Type 1: PING (Required by Discord to verify endpoint)
    if (interaction.type === 1) {
      console.log("[Discord Interactions] Successfully verified PING from Discord!");
      return res.json({ type: 1 });
    }

    // Type 3: MESSAGE_COMPONENT (Button Click)
    if (interaction.type === 3) {
      const customId = interaction.data?.custom_id || "";

      if (customId.startsWith("party_signup_")) {
        const raidId = customId.replace("party_signup_", "");

        // Return a MODAL Popup directly inside Discord! (Type 9)
        return res.json({
          type: 9, // MODAL
          data: {
            custom_id: `party_modal_submit_${raidId}`,
            title: "⚔️ 遠征隊 快速報名",
            components: [
              {
                type: 1, // Action Row
                components: [
                  {
                    type: 4, // Text Input
                    custom_id: "ign",
                    label: "遊戲角色暱稱 (IGN)",
                    style: 1, // Short
                    placeholder: "例如：狂暴之龍",
                    required: true,
                    min_length: 2,
                    max_length: 20
                  }
                ]
              },
              {
                type: 1,
                components: [
                  {
                    type: 4,
                    custom_id: "job",
                    label: "職業",
                    style: 1,
                    placeholder: "例如：龍騎士 / 主教 / 夜使者 / 英雄",
                    required: true,
                    min_length: 2,
                    max_length: 20
                  }
                ]
              },
              {
                type: 1,
                components: [
                  {
                    type: 4,
                    custom_id: "level",
                    label: "角色等級 (Level)",
                    style: 1,
                    placeholder: "例如：135",
                    required: false,
                    max_length: 3
                  }
                ]
              }
            ]
          }
        });
      }

      if (customId.startsWith("party_cancel_")) {
        const raidId = customId.replace("party_cancel_", "");
        const user = interaction.member?.user || interaction.user;
        const discordId = user?.id || "unknown";

        // Remove from store if exists
        if (discordSignupsStore[raidId]) {
          discordSignupsStore[raidId] = discordSignupsStore[raidId].filter(s => s.discordId !== discordId);
        }

        return res.json({
          type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
          data: {
            content: `❌ <@${discordId}> 已成功取消報名！紀錄已更新。`,
            flags: 64 // Ephemeral message (only user sees this)
          }
        });
      }

      if (customId.startsWith("party_status_")) {
        const raidId = customId.replace("party_status_", "");
        const list = discordSignupsStore[raidId] || [];

        const membersText = list.length === 0
          ? "尚無經由 Discord 報名的成員。"
          : list.map((m, i) => `${i + 1}. **${m.ign}** (${m.job} Lv.${m.level}) - <@${m.discordId}>`).join("\n");

        return res.json({
          type: 4,
          data: {
            content: `📋 **目前由 Discord 提交的報名名單 (${list.length} 人)**：\n${membersText}`,
            flags: 64
          }
        });
      }
    }

    // Type 5: MODAL_SUBMIT
    if (interaction.type === 5) {
      const customId = interaction.data?.custom_id || "";

      if (customId.startsWith("party_modal_submit_")) {
        const raidId = customId.replace("party_modal_submit_", "");
        const user = interaction.member?.user || interaction.user;
        const discordId = user?.id || "unknown";
        const username = user?.username || "DiscordUser";
        const avatar = user?.avatar 
          ? `https://cdn.discordapp.com/avatars/${discordId}/${user.avatar}.png` 
          : "https://cdn.discordapp.com/embed/avatars/0.png";

        // Extract inputs
        let ign = "";
        let job = "";
        let level = "120";

        const components = interaction.data?.components || [];
        for (const row of components) {
          for (const comp of row.components || []) {
            if (comp.custom_id === "ign") ign = comp.value?.trim() || "";
            if (comp.custom_id === "job") job = comp.value?.trim() || "";
            if (comp.custom_id === "level") level = comp.value?.trim() || "120";
          }
        }

        // Store signup record
        if (!discordSignupsStore[raidId]) {
          discordSignupsStore[raidId] = [];
        }

        // Upsert by discordId
        const existingIdx = discordSignupsStore[raidId].findIndex(s => s.discordId === discordId);
        const signupRecord = {
          discordId,
          username,
          avatar,
          ign,
          job,
          level,
          signedUpAt: new Date().toISOString()
        };

        if (existingIdx >= 0) {
          discordSignupsStore[raidId][existingIdx] = signupRecord;
        } else {
          discordSignupsStore[raidId].push(signupRecord);
        }

        return res.json({
          type: 4, // Ephemeral response
          data: {
            content: `🎉 **報名成功！**\n👤 **IGN**: \`${ign}\` \n🗡️ **職業**: \`${job}\` \n⭐ **等級**: \`Lv.${level}\` \n🤖 **Discord 帳號**: <@${discordId}>\n\n已成功同步發送！管理員與網頁隊伍列表可即時同步此報名資訊。`,
            flags: 64
          }
        });
      }
    }

    return res.json({ type: 4, data: { content: "Received interaction.", flags: 64 } });
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
