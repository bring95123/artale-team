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
    const { 
      botToken, 
      channelId, 
      raidId, 
      title, 
      bossName, 
      targetCount, 
      currentCount, 
      leaderName, 
      partyMembersSummary, 
      customNote, 
      yesVotes = [],
      noVotes = [],
      maybeVotes = [],
      appUrl = '',
      party1 = [],
      party2 = [],
      party3 = [],
      reserves = [],
      partyCount = 1
    } = req.body;

    if (!botToken || !channelId) {
      return res.status(400).json({ error: "Missing botToken or channelId" });
    }

    try {
      const cleanToken = botToken.trim().replace(/^Bot\s+/i, '');
      const raidKey = raidId || "default_raid";

      // Build Figure 2 style roster & survey texts
      const yesListText = Array.isArray(yesVotes) && yesVotes.length > 0
        ? yesVotes.map((v: any) => `• **${v.ign}** (${v.job} Lv.${v.level || '?'}) ${v.discordId ? `<@${v.discordId}>` : ''}`).join('\n')
        : '*(目前無隊員登記)*';

      const noListText = Array.isArray(noVotes) && noVotes.length > 0
        ? noVotes.map((v: any) => `• **${v.ign}** (${v.job} Lv.${v.level || '?'}) ${v.discordId ? `<@${v.discordId}>` : ''}`).join('\n')
        : '*(目前無隊員登記)*';

      let partyRosterText = '';
      partyRosterText += `🔵 **一隊**：${Array.isArray(party1) && party1.length > 0 ? party1.map((p: any) => `[${p.job}] ${p.ign}`).join(' | ') : '*(暫無隊員)*'}\n`;
      if (partyCount >= 2) {
        partyRosterText += `🟢 **二隊**：${Array.isArray(party2) && party2.length > 0 ? party2.map((p: any) => `[${p.job}] ${p.ign}`).join(' | ') : '*(暫無隊員)*'}\n`;
      }
      if (partyCount >= 3) {
        partyRosterText += `🟣 **三隊**：${Array.isArray(party3) && party3.length > 0 ? party3.map((p: any) => `[${p.job}] ${p.ign}`).join(' | ') : '*(暫無隊員)*'}\n`;
      }
      if (Array.isArray(reserves) && reserves.length > 0) {
        partyRosterText += `🟡 **候補名單**：${reserves.map((p: any) => `[${p.job}] ${p.ign}`).join(' | ')}\n`;
      }

      // Save status to in-memory store
      raidStatusStore[raidKey] = {
        raidId: raidKey,
        title: title || `⚔️ 【${bossName || '遠征隊'}】 互動招募中！`,
        bossName: bossName || '遠征隊',
        targetCount: targetCount || 12,
        currentCount: currentCount || (Array.isArray(party1) ? party1.length + party2.length + party3.length : 0),
        leaderName: leaderName || '冒險者',
        partyCount: partyCount || 1,
        customNote: customNote || '',
        appUrl: appUrl || '',
        yesVotes: Array.isArray(yesVotes) ? yesVotes : [],
        noVotes: Array.isArray(noVotes) ? noVotes : [],
        maybeVotes: Array.isArray(maybeVotes) ? maybeVotes : [],
        party1: Array.isArray(party1) ? party1 : [],
        party2: Array.isArray(party2) ? party2 : [],
        party3: Array.isArray(party3) ? party3 : [],
        reserves: Array.isArray(reserves) ? reserves : [],
        updatedAt: new Date().toISOString()
      };
      saveRaidStatuses();

      const noteSection = customNote ? `\n📌 **隊長叮嚀**：\n> ${customNote.replace(/\n/g, '\n> ')}\n` : '';

      const embed = {
        title: title || `⚔️ 【${bossName || '遠征隊'}】 隊伍招募與意願調查！`,
        description: `👑 **隊長**：${leaderName || '冒險者'} ｜ 🎯 **目標人數**：\`${currentCount || 0} / ${targetCount || 12} 人\`${noteSection}`,
        color: 5814783, // Royal Indigo
        fields: [
          {
            name: `🟢 行程可以配合的人員 (${(yesVotes || []).length} 人)`,
            value: yesListText.length > 1024 ? yesListText.slice(0, 1020) + '...' : yesListText,
            inline: false
          },
          {
            name: `👥 目前小隊陣容錄取編組`,
            value: (partyRosterText || partyMembersSummary || '*(暫無隊員錄取)*').slice(0, 1024),
            inline: false
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: `NyxShade Expedition System • 點擊下方按鈕直接一鍵選擇角色卡報名！`
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
              label: "🙋 快速報名 / 選擇角色卡",
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
      if (msgData?.id) {
        raidStatusStore[raidKey].messageId = msgData.id;
        raidStatusStore[raidKey].channelId = channelId;
        raidStatusStore[raidKey].botToken = cleanToken;
        saveRaidStatuses();
      }
      return res.json({ success: true, messageId: msgData?.id });
    } catch (error: any) {
      console.error("Failed to post interactive card to Discord:", error);
      return res.status(500).json({ error: error.message || "Failed to post interactive card" });
    }
  });

  // Stores for Registered Character Cards & Raid Statuses
  const charsFilePath = path.join(uploadRootDir, "registered_characters.json");
  const raidStatusesFilePath = path.join(uploadRootDir, "raid_statuses.json");
  const keyFilePath = path.join(uploadRootDir, "discord_key.txt");

  let userCharactersStore: Record<string, { username?: string; avatar?: string; characters: any[]; activeCharacterIndex?: number }> = {};
  let raidStatusStore: Record<string, any> = {};
  const discordSignupsStore: Record<string, any[]> = {};
  let serverDiscordPublicKey = process.env.DISCORD_PUBLIC_KEY || "";

  // Load persisted files
  if (fs.existsSync(charsFilePath)) {
    try {
      userCharactersStore = JSON.parse(fs.readFileSync(charsFilePath, "utf-8"));
    } catch (e) {
      console.warn("Failed to load registered_characters.json", e);
    }
  }

  if (fs.existsSync(raidStatusesFilePath)) {
    try {
      raidStatusStore = JSON.parse(fs.readFileSync(raidStatusesFilePath, "utf-8"));
    } catch (e) {
      console.warn("Failed to load raid_statuses.json", e);
    }
  }

  if (!serverDiscordPublicKey && fs.existsSync(keyFilePath)) {
    try {
      serverDiscordPublicKey = fs.readFileSync(keyFilePath, "utf-8").trim();
    } catch (e) {
      console.warn("Failed to read discord_key.txt", e);
    }
  }

  const saveRegisteredCharacters = () => {
    try {
      fs.writeFileSync(charsFilePath, JSON.stringify(userCharactersStore, null, 2), "utf-8");
    } catch (err) {
      console.error("Failed to save registered_characters.json", err);
    }
  };

  const saveRaidStatuses = () => {
    try {
      fs.writeFileSync(raidStatusesFilePath, JSON.stringify(raidStatusStore, null, 2), "utf-8");
    } catch (err) {
      console.error("Failed to save raid_statuses.json", err);
    }
  };

  // Helper to live update public Discord Card message embed
  const updateDiscordCardMessage = async (raidId: string) => {
    const raidInfo = raidStatusStore[raidId];
    if (!raidInfo || !raidInfo.botToken || !raidInfo.channelId || !raidInfo.messageId) {
      return;
    }

    try {
      const yesVotes = raidInfo.yesVotes || [];
      const noVotes = raidInfo.noVotes || [];
      const party1 = raidInfo.party1 || [];
      const party2 = raidInfo.party2 || [];
      const party3 = raidInfo.party3 || [];
      const reserves = raidInfo.reserves || [];
      const partyCount = raidInfo.partyCount || 1;

      const yesListText = Array.isArray(yesVotes) && yesVotes.length > 0
        ? yesVotes.map((v: any) => `• **${v.ign}** (${v.job || '未知'} Lv.${v.level || '?'}) ${v.discordId ? `<@${v.discordId}>` : ''}`).join('\n')
        : '*(目前無隊員登記)*';

      const noListText = Array.isArray(noVotes) && noVotes.length > 0
        ? noVotes.map((v: any) => `• **${v.ign}** (${v.job || '未知'} Lv.${v.level || '?'}) ${v.discordId ? `<@${v.discordId}>` : ''}`).join('\n')
        : '*(目前無隊員登記)*';

      let partyRosterText = '';
      partyRosterText += `🔵 **一隊**：${Array.isArray(party1) && party1.length > 0 ? party1.map((p: any) => `[${p.job}] ${p.ign}`).join(' | ') : '*(暫無隊員)*'}\n`;
      if (partyCount >= 2) {
        partyRosterText += `🟢 **二隊**：${Array.isArray(party2) && party2.length > 0 ? party2.map((p: any) => `[${p.job}] ${p.ign}`).join(' | ') : '*(暫無隊員)*'}\n`;
      }
      if (partyCount >= 3) {
        partyRosterText += `🟣 **三隊**：${Array.isArray(party3) && party3.length > 0 ? party3.map((p: any) => `[${p.job}] ${p.ign}`).join(' | ') : '*(暫無隊員)*'}\n`;
      }
      if (Array.isArray(reserves) && reserves.length > 0) {
        partyRosterText += `🟡 **候補名單**：${reserves.map((p: any) => `[${p.job}] ${p.ign}`).join(' | ')}\n`;
      }

      const noteSection = raidInfo.customNote ? `\n📌 **隊長叮嚀**：\n> ${raidInfo.customNote.replace(/\n/g, '\n> ')}\n` : '';

      const embed = {
        title: raidInfo.title || `⚔️ 【${raidInfo.bossName || '遠征隊'}】 隊伍招募與意願調查！`,
        description: `👑 **隊長**：${raidInfo.leaderName || '冒險者'} ｜ 🎯 **目標人數**：\`${(yesVotes || []).length} / ${raidInfo.targetCount || 12} 人\`${noteSection}`,
        color: 5814783,
        fields: [
          {
            name: `🟢 行程可以配合的人員 (${yesVotes.length} 人)`,
            value: yesListText.length > 1024 ? yesListText.slice(0, 1020) + '...' : yesListText,
            inline: false
          },
          {
            name: `👥 目前小隊陣容錄取編組`,
            value: (partyRosterText || '*(暫無隊員錄取)*').slice(0, 1024),
            inline: false
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: `NyxShade Expedition System • 點擊下方按鈕直接一鍵選擇角色卡報名！`
        }
      };

      await fetch(`https://discord.com/api/v10/channels/${raidInfo.channelId}/messages/${raidInfo.messageId}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bot ${raidInfo.botToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          embeds: [embed]
        })
      });
    } catch (err) {
      console.warn("Failed to patch Discord card message:", err);
    }
  };

  // 🔄 伺服器端：每分鐘 (60 秒) 自動定時輪詢刷新所有已發送的 Discord 招募卡片
  setInterval(async () => {
    try {
      const activeRaidIds = Object.keys(raidStatusStore);
      if (activeRaidIds.length === 0) return;
      for (const raidId of activeRaidIds) {
        const info = raidStatusStore[raidId];
        if (info && info.botToken && info.channelId && info.messageId) {
          await updateDiscordCardMessage(raidId).catch(() => {});
        }
      }
    } catch (e) {
      console.warn("[Auto-Refresh Interval] Error updating Discord cards:", e);
    }
  }, 60000);

  // API Route - Sync full roster of registered users & characters from web client
  app.post("/api/discord/sync-roster", (req: express.Request, res: express.Response) => {
    const { registeredUsers } = req.body;
    if (registeredUsers && typeof registeredUsers === "object") {
      for (const [key, data] of Object.entries(registeredUsers as Record<string, any>)) {
        if (key && data && Array.isArray(data.characters)) {
          const userObj = {
            username: data.username || data.discord?.username || userCharactersStore[key]?.username || "",
            avatar: data.avatar || data.discord?.avatar || userCharactersStore[key]?.avatar || "",
            characters: data.characters,
            activeCharacterIndex: data.activeCharacterIndex || 0
          };
          userCharactersStore[key] = userObj;
          if (data.discord?.id) {
            userCharactersStore[data.discord.id] = userObj;
          }
          if (data.userId) {
            userCharactersStore[data.userId] = userObj;
          }
        }
      }
      saveRegisteredCharacters();
      console.log(`[Roster Sync] Synced registered users to server. Total mapped keys: ${Object.keys(userCharactersStore).length}`);
      return res.json({ success: true, count: Object.keys(userCharactersStore).length });
    }
    return res.status(400).json({ error: "Invalid registeredUsers data" });
  });

  // API Route - Sync single user profile
  app.post("/api/discord/sync-user-profile", (req: express.Request, res: express.Response) => {
    const { discordId, username, avatar, characters, activeCharacterIndex } = req.body;
    if (discordId && Array.isArray(characters)) {
      const userObj = {
        username: username || userCharactersStore[discordId]?.username || "",
        avatar: avatar || userCharactersStore[discordId]?.avatar || "",
        characters,
        activeCharacterIndex: activeCharacterIndex || 0
      };
      userCharactersStore[discordId] = userObj;
      userCharactersStore[`dc_${discordId}`] = userObj;
      saveRegisteredCharacters();
      console.log(`[User Sync] Synced user ${username} (${discordId}) with ${characters.length} characters.`);
      return res.json({ success: true });
    }
    return res.status(400).json({ error: "Missing discordId or characters array" });
  });

  // API Route - Remove a signup from backend store (Called when Admin deletes or user cancels)
  app.post("/api/discord/remove-signup", (req: express.Request, res: express.Response) => {
    const { raidId, discordId, ign, userId } = req.body;
    if (raidId && (ign || discordId || userId)) {
      if (discordSignupsStore[raidId]) {
        discordSignupsStore[raidId] = discordSignupsStore[raidId].filter(s => {
          if (ign && s.ign?.trim().toLowerCase() === ign.trim().toLowerCase()) return false;
          if (discordId && s.discordId === discordId) return false;
          if (userId && (s.userId === userId || `dc_${s.discordId}_${s.ign}` === userId)) return false;
          return true;
        });
      }

      if (raidStatusStore[raidId]) {
        raidStatusStore[raidId].yesVotes = (raidStatusStore[raidId].yesVotes || []).filter((v: any) => {
          if (ign && v.ign?.trim().toLowerCase() === ign.trim().toLowerCase()) return false;
          if (discordId && v.discordId === discordId) return false;
          if (userId && (v.userId === userId || `dc_${v.discordId}_${v.ign}` === userId)) return false;
          return true;
        });
        saveRaidStatuses();
        updateDiscordCardMessage(raidId).catch(() => {});
      }

      return res.json({ success: true });
    }
    return res.status(400).json({ error: "Missing raidId or filter criteria" });
  });

  // API Route - Record Web Signup to Server Store and patch Discord Card
  app.post("/api/discord/record-web-signup", (req: express.Request, res: express.Response) => {
    const { raidId, discordId, ign, job, level, memo, userId } = req.body;
    if (raidId && ign) {
      if (!discordSignupsStore[raidId]) {
        discordSignupsStore[raidId] = [];
      }

      const signupRecord = {
        discordId: discordId || "",
        ign,
        job: job || "主教",
        level: level || 120,
        memo: memo || "",
        userId: userId || (discordId ? `dc_${discordId}_${ign}` : `web_${ign}`),
        signedUpAt: new Date().toISOString()
      };

      const existingIdx = discordSignupsStore[raidId].findIndex(s =>
        s.ign?.trim().toLowerCase() === ign.trim().toLowerCase()
      );
      if (existingIdx >= 0) {
        discordSignupsStore[raidId][existingIdx] = signupRecord;
      } else {
        discordSignupsStore[raidId].push(signupRecord);
      }

      if (raidStatusStore[raidId]) {
        const currentYes = raidStatusStore[raidId].yesVotes || [];
        const vIdx = currentYes.findIndex((v: any) =>
          v.ign?.trim().toLowerCase() === ign.trim().toLowerCase()
        );
        const voterObj = {
          userId: signupRecord.userId,
          discordId: discordId || undefined,
          ign,
          job: job || "主教",
          level: level || 120,
          memo: memo || ""
        };
        if (vIdx >= 0) {
          currentYes[vIdx] = voterObj;
        } else {
          currentYes.push(voterObj);
        }
        raidStatusStore[raidId].yesVotes = currentYes;
        raidStatusStore[raidId].noVotes = (raidStatusStore[raidId].noVotes || []).filter((v: any) =>
          !(v.ign?.trim().toLowerCase() === ign.trim().toLowerCase())
        );
        saveRaidStatuses();
        updateDiscordCardMessage(raidId).catch(() => {});
      }

      return res.json({ success: true });
    }
    return res.status(400).json({ error: "Missing raidId or ign" });
  });

  // API Route - Sync Raid Status (Figure 2 data) from Web Client
  app.post("/api/discord/sync-raid-status", (req: express.Request, res: express.Response) => {
    const { raidId, ...statusData } = req.body;
    if (raidId) {
      raidStatusStore[raidId] = {
        ...(raidStatusStore[raidId] || {}),
        ...statusData,
        raidId,
        updatedAt: new Date().toISOString()
      };
      saveRaidStatuses();
      updateDiscordCardMessage(raidId).catch(() => {});
      return res.json({ success: true });
    }
    return res.status(400).json({ error: "Missing raidId" });
  });

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

    // Type 3: MESSAGE_COMPONENT (Button Click or Select Menu)
    if (interaction.type === 3) {
      const customId = interaction.data?.custom_id || "";
      const user = interaction.member?.user || interaction.user;
      const discordId = user?.id || "unknown";
      const username = user?.global_name || user?.username || "DiscordUser";
      const avatar = user?.avatar 
        ? `https://cdn.discordapp.com/avatars/${discordId}/${user.avatar}.png` 
        : `https://cdn.discordapp.com/embed/avatars/${Number(discordId) % 5}.png`;

      // 1. Click: [🙋 快速報名 / 選擇角色卡]
      if (customId.startsWith("party_signup_")) {
        const raidId = customId.replace("party_signup_", "");
        const raidInfo = raidStatusStore[raidId];
        const bossTitle = raidInfo?.bossName || raidInfo?.title || "遠征隊";

        // Check if user has registered character cards on website
        let userProfile = userCharactersStore[discordId];

        // Robust fallback lookup: match by username, global_name, or stored character IGNs
        if (!userProfile || !userProfile.characters || userProfile.characters.length === 0) {
          const matchedEntry = Object.entries(userCharactersStore).find(([k, u]: [string, any]) => {
            if (u.username && (
              u.username.toLowerCase() === username.toLowerCase() || 
              (user?.username && u.username.toLowerCase() === user.username.toLowerCase()) ||
              (user?.global_name && u.username.toLowerCase() === user.global_name.toLowerCase())
            )) return true;
            if (u.characters && Array.isArray(u.characters)) {
              return u.characters.some((c: any) => c.ign && (
                c.ign.toLowerCase() === username.toLowerCase() ||
                (user?.username && c.ign.toLowerCase() === user.username.toLowerCase()) ||
                (user?.global_name && c.ign.toLowerCase() === user.global_name.toLowerCase())
              ));
            }
            return false;
          });

          if (matchedEntry) {
            userProfile = matchedEntry[1];
            // Auto-bind to discord snowflake ID for fast future lookups
            userCharactersStore[discordId] = userProfile;
            saveRegisteredCharacters();
          }
        }

        const characters = userProfile?.characters || [];

        // Check which characters the user has already signed up with
        const userSignups = (discordSignupsStore[raidId] || []).filter(s => s.discordId === discordId);
        const signedUpIgns = new Set(userSignups.map(s => s.ign));

        if (characters.length > 0) {
          // USER HAS REGISTERED CHARACTERS: Send Ephemeral Select Menu with character cards!
          // Build options for all characters (allows multiple characters to sign up)
          const options = [
            ...characters.slice(0, 24).map((c: any, idx: number) => {
              const isSignedUp = signedUpIgns.has(c.ign);
              return {
                label: `${isSignedUp ? '✅ ' : ''}${c.ign} (${c.job})`.slice(0, 100),
                value: `char_${idx}`,
                description: `${isSignedUp ? '[已登記報名] ' : ''}等級 Lv.${c.level || 120} ${c.memo ? `• ${c.memo}` : ''}`.slice(0, 100),
                emoji: { name: isSignedUp ? "✅" : "⚔️" }
              };
            }),
            {
              label: "🌐 前往網站註冊 / 管理角色卡 (開啟網頁)",
              value: "open_web_register",
              description: "點此開啟網頁直接註冊角色卡與綁定職業",
              emoji: { name: "🌐" }
            }
          ];

          let statusMsg = `👋 <@${discordId}> 歡迎！系統已辨識您在網站註冊的 **${characters.length}** 張角色卡。\n`;
          if (userSignups.length > 0) {
            statusMsg += `\n📌 **您目前已報名本遠征隊的角色 (${userSignups.length} 隻)**：\n` + 
              userSignups.map(s => `• 🗡️ **${s.ign}** (${s.job} Lv.${s.level || '?'})`).join('\n') +
              `\n\n*(💡 本系統支援多角色同時報名，您可直接點選下方其他角色卡繼續報名，或點擊「❌ 取消報名」依角色卡個別取消)*`;
          } else {
            statusMsg += `\n請在下方選單中選擇要參加 **【${bossTitle}】** 的角色卡 (支援多角色同時報名)：`;
          }

          return res.json({
            type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
            data: {
              flags: 64, // Ephemeral (only clicking user can see)
              content: statusMsg,
              components: [
                {
                  type: 1, // Action Row
                  components: [
                    {
                      type: 3, // String Select Menu
                      custom_id: `select_char_${raidId}`,
                      placeholder: "🎮 點擊選擇出團角色卡 (可多選報名)...",
                      options
                    }
                  ]
                }
              ]
            }
          });
        }

        // USER HAS NOT REGISTERED CHARACTERS: Direct Link Button to web (No manual input)
        const webUrl = raidInfo?.appUrl || (req.headers.origin as string) || (req.get('host') ? `https://${req.get('host')}` : 'https://ais-dev-4ngurwkxlrhrrzz5pek4mo-482405179645.asia-east1.run.app');
        return res.json({
          type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
          data: {
            flags: 64,
            content: `👋 <@${discordId}> 您好！\n您目前尚未在網站註冊專屬出團角色卡。\n\n請點擊下方按鈕前往網站建立角色卡並綁定 Discord，建立後即可在 Discord 享受一鍵下拉報名出團的便利！`,
            components: [
              {
                type: 1, // Action Row
                components: [
                  {
                    type: 2, // BUTTON
                    style: 5, // Link Button (Opens URL directly)
                    label: "🌐 點此前往網站註冊角色卡",
                    url: webUrl,
                    emoji: { name: "💳" }
                  }
                ]
              }
            ]
          }
        });
      }

      // 2. Select: Character Card chosen from Select Menu
      if (customId.startsWith("select_char_")) {
        const raidId = customId.replace("select_char_", "");
        const selectedValue = interaction.data?.values?.[0] || "";
        const raidInfo = raidStatusStore[raidId];
        const bossTitle = raidInfo?.bossName || raidInfo?.title || "遠征隊";
        const webUrl = raidInfo?.appUrl || (req.headers.origin as string) || (req.get('host') ? `https://${req.get('host')}` : 'https://ais-dev-4ngurwkxlrhrrzz5pek4mo-482405179645.asia-east1.run.app');

        if (selectedValue === "open_web_register") {
          return res.json({
            type: 7, // UPDATE_MESSAGE
            data: {
              content: `🌐 **前往網站註冊 / 管理角色卡**\n\n點擊下方按鈕即可直接開啟網站進行角色卡註冊與管理！\n在網站設定完成後，下次在 Discord 點選「🙋 快速報名」即可直接一鍵下拉選擇出團角色！`,
              components: [
                {
                  type: 1,
                  components: [
                    {
                      type: 2, // BUTTON
                      style: 5, // Link Button (Opens URL directly)
                      label: "🚀 點此開啟網站註冊角色卡",
                      url: webUrl,
                      emoji: { name: "🌐" }
                    }
                  ]
                }
              ]
            }
          });
        }

        if (selectedValue.startsWith("char_")) {
          const charIndex = parseInt(selectedValue.replace("char_", ""), 10);
          const userProfile = userCharactersStore[discordId];
          const selectedChar = userProfile?.characters?.[charIndex];

          if (!selectedChar) {
            return res.json({
              type: 7,
              data: {
                content: "⚠️ 找不到該角色卡，可能已被刪除或更新。請重新點擊報名按鈕！",
                components: []
              }
            });
          }

          // Record signup in store (keyed by ign / discordId + ign to allow multiple character registrations)
          if (!discordSignupsStore[raidId]) {
            discordSignupsStore[raidId] = [];
          }

          const signupRecord = {
            discordId,
            username,
            avatar,
            ign: selectedChar.ign,
            job: selectedChar.job,
            level: selectedChar.level || 120,
            memo: selectedChar.memo || "",
            vote: "yes",
            votes: { 0: "yes", interest: "yes" },
            signedUpAt: new Date().toISOString()
          };

          const existingIdx = discordSignupsStore[raidId].findIndex(s => 
            s.ign?.trim().toLowerCase() === selectedChar.ign?.trim().toLowerCase() || (s.discordId === discordId && s.ign === selectedChar.ign)
          );
          if (existingIdx >= 0) {
            discordSignupsStore[raidId][existingIdx] = signupRecord;
          } else {
            discordSignupsStore[raidId].push(signupRecord);
          }

          // Update raidStatusStore yesVotes
          if (raidStatusStore[raidId]) {
            const currentYes = raidStatusStore[raidId].yesVotes || [];
            const vIdx = currentYes.findIndex((v: any) => 
              v.ign?.trim().toLowerCase() === selectedChar.ign?.trim().toLowerCase() || (v.discordId === discordId && v.ign === selectedChar.ign)
            );
            const voterObj = {
              userId: `dc_${discordId}_${selectedChar.ign}`,
              discordId,
              ign: selectedChar.ign,
              job: selectedChar.job,
              level: selectedChar.level || 120,
              memo: selectedChar.memo || "",
              vote: "yes",
              votes: { 0: "yes", interest: "yes" },
              discord: { id: discordId, username, avatar }
            };
            if (vIdx >= 0) {
              currentYes[vIdx] = voterObj;
            } else {
              currentYes.push(voterObj);
            }
            raidStatusStore[raidId].yesVotes = currentYes;
            // Remove from noVotes if present for this character
            raidStatusStore[raidId].noVotes = (raidStatusStore[raidId].noVotes || []).filter((v: any) => 
              !(v.ign?.trim().toLowerCase() === selectedChar.ign?.trim().toLowerCase())
            );
            saveRaidStatuses();
            updateDiscordCardMessage(raidId).catch(() => {});
          }

          // Get updated signups for this user
          const allUserSignups = discordSignupsStore[raidId].filter(s => s.discordId === discordId);

          return res.json({
            type: 7, // UPDATE_MESSAGE
            data: {
              content: `🎉 **角色卡報名成功！**\n\n已成功為您登記出團角色卡：\n🗡️ **【${selectedChar.ign}】** (${selectedChar.job} Lv.${selectedChar.level || 120})\n🤖 **Discord 帳號**: <@${discordId}>\n\n🟢 **出團意願已登記為「可以配合」！** (已即時同步更新至頻道卡片與網站)\n*(目前您已以此帳號報名 ${allUserSignups.length} 隻角色：${allUserSignups.map(s => s.ign).join(', ')})*\n\n💡 提示：若需再加報其他角色，可再次點擊「🙋 快速報名 / 選擇角色卡」選擇其他卡片！`,
              components: []
            }
          });
        }
      }

      // 3. Click: [📝 開啟填寫表單] (from manual input option)
      if (customId.startsWith("open_modal_btn_")) {
        const raidId = customId.replace("open_modal_btn_", "");
        return res.json({
          type: 9, // MODAL
          data: {
            custom_id: `party_modal_submit_${raidId}`,
            title: "⚔️ 遠征隊 快速報名",
            components: [
              {
                type: 1,
                components: [
                  {
                    type: 4,
                    custom_id: "ign",
                    label: "遊戲角色暱稱 (IGN)",
                    style: 1,
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

      // 4. Click: [❌ 取消報名] - Support individual character cancellation or menu if multiple
      if (customId.startsWith("party_cancel_")) {
        const raidId = customId.replace("party_cancel_", "");

        // Find all signups by this discord user for this raid
        const userSignups = (discordSignupsStore[raidId] || []).filter(s => s.discordId === discordId);
        const raidInfo = raidStatusStore[raidId];
        const yesVotesForUser = (raidInfo?.yesVotes || []).filter((v: any) => 
          v.discordId === discordId || v.discord?.id === discordId || (v.userId && v.userId.includes(discordId))
        );

        // Merge to get all characters this user has signed up with
        const allSignedUpChars: any[] = [];
        const seen = new Set<string>();
        for (const s of [...userSignups, ...yesVotesForUser]) {
          const ignKey = (s.ign || '').trim().toLowerCase();
          if (ignKey && !seen.has(ignKey)) {
            seen.add(ignKey);
            allSignedUpChars.push({
              ign: s.ign,
              job: s.job || '冒險家',
              level: s.level || 120,
              discordId
            });
          }
        }

        if (allSignedUpChars.length === 0) {
          return res.json({
            type: 4,
            data: {
              content: `ℹ️ <@${discordId}> 您目前尚未報名此遠征隊，無需取消。`,
              flags: 64
            }
          });
        }

        if (allSignedUpChars.length === 1) {
          // Single character: cancel directly
          const targetChar = allSignedUpChars[0];
          discordSignupsStore[raidId] = (discordSignupsStore[raidId] || []).filter(
            s => !(s.ign?.trim().toLowerCase() === targetChar.ign?.trim().toLowerCase())
          );

          if (raidStatusStore[raidId]) {
            raidStatusStore[raidId].yesVotes = (raidStatusStore[raidId].yesVotes || []).filter(
              (v: any) => !(v.ign?.trim().toLowerCase() === targetChar.ign?.trim().toLowerCase())
            );
            const currentNo = raidStatusStore[raidId].noVotes || [];
            if (!currentNo.some((v: any) => v.ign?.trim().toLowerCase() === targetChar.ign?.trim().toLowerCase())) {
              currentNo.push({
                userId: `dc_${discordId}_${targetChar.ign}`,
                discordId,
                ign: targetChar.ign,
                job: targetChar.job || "取消參加",
                level: targetChar.level || "",
                discord: { id: discordId, username, avatar }
              });
              raidStatusStore[raidId].noVotes = currentNo;
            }
            saveRaidStatuses();
            updateDiscordCardMessage(raidId).catch(() => {});
          }

          return res.json({
            type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
            data: {
              content: `❌ <@${discordId}> 已取消角色 **【${targetChar.ign}】** (${targetChar.job}) 的報名！\n*(已即時同步更新至 Discord 頻道卡片與網站意願名單)*`,
              flags: 64
            }
          });
        }

        // Multiple characters signed up: provide menu to select which character card to cancel, or cancel all
        const cancelOptions = [
          ...allSignedUpChars.map((s, idx) => ({
            label: `❌ 取消：${s.ign} (${s.job} Lv.${s.level || '?'})`.slice(0, 100),
            value: `cancel_char_${idx}_${s.ign}`.slice(0, 100),
            description: `僅取消此角色卡的報名`,
            emoji: { name: "🗑️" }
          })),
          {
            label: `💥 取消此帳號名下「全部角色」(${allSignedUpChars.length} 隻)`,
            value: `cancel_all_chars`,
            description: `全部取消報名並標示為不克參加`,
            emoji: { name: "⚠️" }
          }
        ];

        return res.json({
          type: 4,
          data: {
            flags: 64,
            content: `❓ <@${discordId}> 您目前已報名了 **${allSignedUpChars.length}** 位角色，請選擇您要取消哪一張角色卡的報名：`,
            components: [
              {
                type: 1,
                components: [
                  {
                    type: 3,
                    custom_id: `select_cancel_char_${raidId}`,
                    placeholder: "🎯 選擇要取消報名的角色卡...",
                    options: cancelOptions
                  }
                ]
              }
            ]
          }
        });
      }

      // Handle selection from cancel menu
      if (customId.startsWith("select_cancel_char_")) {
        const raidId = customId.replace("select_cancel_char_", "");
        const selectedValue = interaction.data?.values?.[0] || "";

        if (selectedValue === "cancel_all_chars") {
          const removed = (discordSignupsStore[raidId] || []).filter(s => s.discordId === discordId);
          discordSignupsStore[raidId] = (discordSignupsStore[raidId] || []).filter(s => s.discordId !== discordId);

          if (raidStatusStore[raidId]) {
            const yesVotes = raidStatusStore[raidId].yesVotes || [];
            const userYesVotes = yesVotes.filter((v: any) => v.discordId === discordId || v.discord?.id === discordId);
            raidStatusStore[raidId].yesVotes = yesVotes.filter((v: any) => !(v.discordId === discordId || v.discord?.id === discordId));
            
            const currentNo = raidStatusStore[raidId].noVotes || [];
            for (const r of [...removed, ...userYesVotes]) {
              if (!currentNo.some((v: any) => v.ign?.trim().toLowerCase() === r.ign?.trim().toLowerCase())) {
                currentNo.push({
                  userId: `dc_${discordId}_${r.ign}`,
                  discordId,
                  ign: r.ign,
                  job: r.job || "取消參加",
                  level: r.level || "",
                  discord: { id: discordId, username, avatar }
                });
              }
            }
            raidStatusStore[raidId].noVotes = currentNo;
            saveRaidStatuses();
            updateDiscordCardMessage(raidId).catch(() => {});
          }

          return res.json({
            type: 7,
            data: {
              content: `❌ <@${discordId}> 已取消全部角色的報名！\n*(已即時更新至 Discord 頻道卡片與網站名單)*`,
              components: []
            }
          });
        }

        if (selectedValue.startsWith("cancel_char_")) {
          // Format: cancel_char_${idx}_${ign}
          const targetIgn = selectedValue.split("_").slice(3).join("_");

          discordSignupsStore[raidId] = (discordSignupsStore[raidId] || []).filter(
            s => !(s.ign?.trim().toLowerCase() === targetIgn?.trim().toLowerCase())
          );

          if (raidStatusStore[raidId]) {
            const targetChar = (raidStatusStore[raidId].yesVotes || []).find(
              (v: any) => v.ign?.trim().toLowerCase() === targetIgn?.trim().toLowerCase()
            );
            raidStatusStore[raidId].yesVotes = (raidStatusStore[raidId].yesVotes || []).filter(
              (v: any) => !(v.ign?.trim().toLowerCase() === targetIgn?.trim().toLowerCase())
            );
            const currentNo = raidStatusStore[raidId].noVotes || [];
            if (!currentNo.some((v: any) => v.ign?.trim().toLowerCase() === targetIgn?.trim().toLowerCase())) {
              currentNo.push({
                userId: `dc_${discordId}_${targetIgn}`,
                discordId,
                ign: targetIgn,
                job: targetChar?.job || "取消參加",
                level: targetChar?.level || "",
                discord: { id: discordId, username, avatar }
              });
              raidStatusStore[raidId].noVotes = currentNo;
            }
            saveRaidStatuses();
            updateDiscordCardMessage(raidId).catch(() => {});
          }

          const remainingSignups = (discordSignupsStore[raidId] || []).filter(s => s.discordId === discordId);

          return res.json({
            type: 7,
            data: {
              content: `❌ <@${discordId}> 已成功個別取消角色 **【${targetIgn}】** 的報名！\n${remainingSignups.length > 0 ? `\n📌 您仍有 ${remainingSignups.length} 隻角色保留在遠征隊中：\n` + remainingSignups.map(s => `• 🗡️ **${s.ign}** (${s.job})`).join('\n') : ''}\n*(已即時更新至 Discord 頻道卡片與網站)*`,
              components: []
            }
          });
        }
      }

      // 5. Click: [📋 隊伍現況] - Figure 2 full status display
      if (customId.startsWith("party_status_")) {
        const raidId = customId.replace("party_status_", "");
        const status = raidStatusStore[raidId] || {};

        // Combine yesVotes from status
        const yesList = status.yesVotes || [];
        const noList = status.noVotes || [];

        const yesText = yesList.length > 0
          ? yesList.map((v: any) => `• **${v.ign}** (${v.job || '未知'} Lv.${v.level || '?'}) ${v.discordId ? `<@${v.discordId}>` : ''}`).join('\n')
          : "*(目前無隊員登記)*";

        const noText = noList.length > 0
          ? noList.map((v: any) => `• **${v.ign}** (${v.job || '未知'} Lv.${v.level || '?'}) ${v.discordId ? `<@${v.discordId}>` : ''}`).join('\n')
          : "*(目前無隊員登記)*";

        let partyRoster = "";
        partyRoster += `🔵 **一隊**：${status.party1 && status.party1.length > 0 ? status.party1.map((p: any) => `[${p.job}] ${p.ign}`).join(' | ') : '*(暫無隊員)*'}\n`;
        if ((status.partyCount || 1) >= 2) {
          partyRoster += `🟢 **二隊**：${status.party2 && status.party2.length > 0 ? status.party2.map((p: any) => `[${p.job}] ${p.ign}`).join(' | ') : '*(暫無隊員)*'}\n`;
        }
        if ((status.partyCount || 1) >= 3) {
          partyRoster += `🟣 **三隊**：${status.party3 && status.party3.length > 0 ? status.party3.map((p: any) => `[${p.job}] ${p.ign}`).join(' | ') : '*(暫無隊員)*'}\n`;
        }
        if (status.reserves && status.reserves.length > 0) {
          partyRoster += `🟡 **候補名單**：${status.reserves.map((p: any) => `[${p.job}] ${p.ign}`).join(' | ')}\n`;
        }

        const fullStatusContent = [
          `📋 **【${status.bossName || status.title || '遠征隊'}】 突襲團意願與陣容現況**`,
          `👑 **團長**：${status.leaderName || '冒險者'}\n`,
          `🟢 **行程可以配合的人員 (${yesList.length} 人)**：\n${yesText}\n`,
          `🔴 **行程不克參加的人員 (${noList.length} 人)**：\n${noText}\n`,
          `👥 **目前小隊錄取編組名單**：\n${partyRoster}\n`,
          `*(💡 點擊「🙋 快速報名 / 選擇角色卡」即可直接挑選網站角色卡快速報名！)*`
        ].join('\n');

        return res.json({
          type: 4,
          data: {
            content: fullStatusContent.slice(0, 2000),
            flags: 64
          }
        });
      }
    }

    // Type 5: MODAL_SUBMIT (Manual Character Input)
    if (interaction.type === 5) {
      const customId = interaction.data?.custom_id || "";

      if (customId.startsWith("party_modal_submit_")) {
        const raidId = customId.replace("party_modal_submit_", "");
        const user = interaction.member?.user || interaction.user;
        const discordId = user?.id || "unknown";
        const username = user?.global_name || user?.username || "DiscordUser";
        const avatar = user?.avatar 
          ? `https://cdn.discordapp.com/avatars/${discordId}/${user.avatar}.png` 
          : `https://cdn.discordapp.com/embed/avatars/${Number(discordId) % 5}.png`;

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

        if (!discordSignupsStore[raidId]) {
          discordSignupsStore[raidId] = [];
        }

        const signupRecord = {
          discordId,
          username,
          avatar,
          ign,
          job,
          level,
          vote: "yes",
          signedUpAt: new Date().toISOString()
        };

        const existingIdx = discordSignupsStore[raidId].findIndex(s => s.discordId === discordId && s.ign === ign);
        if (existingIdx >= 0) {
          discordSignupsStore[raidId][existingIdx] = signupRecord;
        } else {
          discordSignupsStore[raidId].push(signupRecord);
        }

        if (!userCharactersStore[discordId]) {
          userCharactersStore[discordId] = {
            username,
            avatar,
            characters: [],
            activeCharacterIndex: 0
          };
        }
        // If character not in list, add to registered character list
        const existingCharIdx = userCharactersStore[discordId].characters.findIndex((c: any) => c.ign === ign);
        if (existingCharIdx >= 0) {
          userCharactersStore[discordId].characters[existingCharIdx] = {
            ...userCharactersStore[discordId].characters[existingCharIdx],
            ign,
            job,
            level: parseInt(level, 10) || 120
          };
        } else {
          userCharactersStore[discordId].characters.push({
            ign,
            job,
            level: parseInt(level, 10) || 120,
            memo: "Discord 報名建立",
            isMain: userCharactersStore[discordId].characters.length === 0
          });
        }
        saveRegisteredCharacters();

        // Update raidStatusStore
        if (raidStatusStore[raidId]) {
          const currentYes = raidStatusStore[raidId].yesVotes || [];
          const vIdx = currentYes.findIndex((v: any) => v.discordId === discordId && v.ign === ign);
          const voterObj = {
            userId: `dc_${discordId}_${ign}`,
            discordId,
            ign,
            job,
            level,
            memo: "Discord 表單報名",
            discord: { id: discordId, username, avatar }
          };
          if (vIdx >= 0) {
            currentYes[vIdx] = voterObj;
          } else {
            currentYes.push(voterObj);
          }
          raidStatusStore[raidId].yesVotes = currentYes;
          raidStatusStore[raidId].noVotes = (raidStatusStore[raidId].noVotes || []).filter((v: any) => !(v.discordId === discordId && v.ign === ign));
          saveRaidStatuses();
        }

        const allUserSignups = discordSignupsStore[raidId].filter(s => s.discordId === discordId);

        return res.json({
          type: 4,
          data: {
            content: `🎉 **手動角色報名與角色卡登記成功！**\n\n🗡️ **角色 (IGN)**: \`${ign}\` \n🛡️ **職業**: \`${job}\` \n⭐ **等級**: \`Lv.${level}\` \n🤖 **Discord 帳號**: <@${discordId}>\n\n🟢 **出團意願已登記為「可以配合」！**\n💳 **系統已自動為您將此角色保存為專屬角色卡**，下次報名任何遠征隊時即可直接在選單中一鍵選擇！\n*(目前此帳號已登記出團 ${allUserSignups.length} 隻角色)*`,
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
