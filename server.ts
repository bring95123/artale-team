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
      appUrl,
      yesVotes = [],
      noVotes = [],
      maybeVotes = [],
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
            name: `🔴 行程不克參加的人員 (${(noVotes || []).length} 人)`,
            value: noListText.length > 1024 ? noListText.slice(0, 1020) + '...' : noListText,
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
      return res.json({ success: true, messageId: msgData.id });
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

  // API Route - Sync full roster of registered users & characters from web client
  app.post("/api/discord/sync-roster", (req: express.Request, res: express.Response) => {
    const { registeredUsers } = req.body;
    if (registeredUsers && typeof registeredUsers === "object") {
      for (const [discordId, data] of Object.entries(registeredUsers as Record<string, any>)) {
        if (discordId && data && Array.isArray(data.characters)) {
          userCharactersStore[discordId] = {
            username: data.username || data.discord?.username || userCharactersStore[discordId]?.username || "",
            avatar: data.avatar || data.discord?.avatar || userCharactersStore[discordId]?.avatar || "",
            characters: data.characters,
            activeCharacterIndex: data.activeCharacterIndex || 0
          };
        }
      }
      saveRegisteredCharacters();
      console.log(`[Roster Sync] Synced ${Object.keys(registeredUsers).length} registered users to server.`);
      return res.json({ success: true, count: Object.keys(userCharactersStore).length });
    }
    return res.status(400).json({ error: "Invalid registeredUsers data" });
  });

  // API Route - Sync single user profile
  app.post("/api/discord/sync-user-profile", (req: express.Request, res: express.Response) => {
    const { discordId, username, avatar, characters, activeCharacterIndex } = req.body;
    if (discordId && Array.isArray(characters)) {
      userCharactersStore[discordId] = {
        username: username || userCharactersStore[discordId]?.username || "",
        avatar: avatar || userCharactersStore[discordId]?.avatar || "",
        characters,
        activeCharacterIndex: activeCharacterIndex || 0
      };
      saveRegisteredCharacters();
      console.log(`[User Sync] Synced user ${username} (${discordId}) with ${characters.length} characters.`);
      return res.json({ success: true });
    }
    return res.status(400).json({ error: "Missing discordId or characters array" });
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

      // 1. Click: [🙋 快速報名 / 變更職業]
      if (customId.startsWith("party_signup_")) {
        const raidId = customId.replace("party_signup_", "");
        const raidInfo = raidStatusStore[raidId];
        const bossTitle = raidInfo?.bossName || raidInfo?.title || "遠征隊";

        // Check if user has registered character cards on website
        const userProfile = userCharactersStore[discordId];
        const characters = userProfile?.characters || [];

        if (characters.length > 0) {
          // USER HAS REGISTERED CHARACTERS: Send Ephemeral Select Menu with character cards!
          const options = [
            ...characters.slice(0, 24).map((c: any, idx: number) => ({
              label: `${c.ign} (${c.job})`.slice(0, 100),
              value: `char_${idx}`,
              description: `等級 Lv.${c.level || 120} ${c.memo ? `• ${c.memo}` : ''}`.slice(0, 100),
              emoji: { name: "⚔️" }
            })),
            {
              label: "✍️ 手動輸入其他角色 (未在網站登記)",
              value: "manual_custom_char",
              description: "自行輸入自訂暱稱與職業",
              emoji: { name: "📝" }
            }
          ];

          return res.json({
            type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
            data: {
              flags: 64, // Ephemeral (only clicking user can see)
              content: `👋 <@${discordId}> 歡迎！系統已為您預先讀取在網站上註冊的 **${characters.length}** 張角色卡。\n\n請在下方選單中選擇要以哪位角色參加 **【${bossTitle}】**：`,
              components: [
                {
                  type: 1, // Action Row
                  components: [
                    {
                      type: 3, // String Select Menu
                      custom_id: `select_char_${raidId}`,
                      placeholder: "🎮 點擊選擇出團角色卡...",
                      options
                    }
                  ]
                }
              ]
            }
          });
        }

        // USER HAS NOT REGISTERED CHARACTERS: Return text Modal (Type 9)
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

      // 2. Select: Character Card chosen from Select Menu
      if (customId.startsWith("select_char_")) {
        const raidId = customId.replace("select_char_", "");
        const selectedValue = interaction.data?.values?.[0] || "";
        const raidInfo = raidStatusStore[raidId];
        const bossTitle = raidInfo?.bossName || raidInfo?.title || "遠征隊";

        if (selectedValue === "manual_custom_char") {
          return res.json({
            type: 7, // UPDATE_MESSAGE
            data: {
              content: `✍️ **手動輸入角色報名**\n請點擊下方按鈕開啟自訂角色填寫表單：`,
              components: [
                {
                  type: 1,
                  components: [
                    {
                      type: 2, // BUTTON
                      style: 1,
                      custom_id: `open_modal_btn_${raidId}`,
                      label: "📝 開啟填寫表單",
                      emoji: { name: "📝" }
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

          // Record signup in store
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
            signedUpAt: new Date().toISOString()
          };

          const existingIdx = discordSignupsStore[raidId].findIndex(s => s.discordId === discordId);
          if (existingIdx >= 0) {
            discordSignupsStore[raidId][existingIdx] = signupRecord;
          } else {
            discordSignupsStore[raidId].push(signupRecord);
          }

          // Update raidStatusStore yesVotes
          if (raidStatusStore[raidId]) {
            const currentYes = raidStatusStore[raidId].yesVotes || [];
            const vIdx = currentYes.findIndex((v: any) => v.discordId === discordId);
            const voterObj = {
              userId: `dc_${discordId}`,
              discordId,
              ign: selectedChar.ign,
              job: selectedChar.job,
              level: selectedChar.level || 120,
              memo: selectedChar.memo || "",
              discord: { id: discordId, username, avatar }
            };
            if (vIdx >= 0) {
              currentYes[vIdx] = voterObj;
            } else {
              currentYes.push(voterObj);
            }
            raidStatusStore[raidId].yesVotes = currentYes;
            // Remove from noVotes if present
            raidStatusStore[raidId].noVotes = (raidStatusStore[raidId].noVotes || []).filter((v: any) => v.discordId !== discordId);
            saveRaidStatuses();
          }

          return res.json({
            type: 7, // UPDATE_MESSAGE
            data: {
              content: `🎉 **報名成功！**\n\n已成功為您選擇角色卡：\n🗡️ **【${selectedChar.ign}】** (${selectedChar.job} Lv.${selectedChar.level || 120})\n🤖 **Discord**: <@${discordId}>\n\n🟢 **出團意願已登記為「可以配合」！**\n團長可在網站直接為您排班並錄取至小隊。如欲更換角色可再次點擊「🙋 快速報名」按鈕切換。`,
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

      // 4. Click: [❌ 取消報名]
      if (customId.startsWith("party_cancel_")) {
        const raidId = customId.replace("party_cancel_", "");

        if (discordSignupsStore[raidId]) {
          discordSignupsStore[raidId] = discordSignupsStore[raidId].filter(s => s.discordId !== discordId);
        }

        if (raidStatusStore[raidId]) {
          raidStatusStore[raidId].yesVotes = (raidStatusStore[raidId].yesVotes || []).filter((v: any) => v.discordId !== discordId);
          // Add to noVotes
          const currentNo = raidStatusStore[raidId].noVotes || [];
          if (!currentNo.some((v: any) => v.discordId === discordId)) {
            currentNo.push({
              userId: `dc_${discordId}`,
              discordId,
              ign: username,
              job: "取消參加",
              level: "",
              discord: { id: discordId, username, avatar }
            });
            raidStatusStore[raidId].noVotes = currentNo;
          }
          saveRaidStatuses();
        }

        return res.json({
          type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
          data: {
            content: `❌ <@${discordId}> 已取消報名！您的出團意願已更新為「不克參加」。`,
            flags: 64
          }
        });
      }

      // 5. Click: [📋 隊伍現況] - Figure 2 full status display
      if (customId.startsWith("party_status_")) {
        const raidId = customId.replace("party_status_", "");
        const status = raidStatusStore[raidId] || {};
        const signups = discordSignupsStore[raidId] || [];

        // Combine yesVotes from status and recent signups
        const yesList = status.yesVotes || [];
        const noList = status.noVotes || [];

        const yesText = yesList.length > 0
          ? yesList.map((v: any) => `• **${v.ign}** (${v.job} Lv.${v.level || '?'}) ${v.discordId ? `<@${v.discordId}>` : ''}`).join('\n')
          : "*(目前無隊員登記)*";

        const noText = noList.length > 0
          ? noList.map((v: any) => `• **${v.ign}** (${v.job} Lv.${v.level || '?'}) ${v.discordId ? `<@${v.discordId}>` : ''}`).join('\n')
          : "*(目前無隊員登記)*";

        let partyRoster = "";
        partyRoster += `🔵 **一隊**：${status.party1 && status.party1.length > 0 ? status.party1.map((p: any) => `[${p.job}] ${p.ign}`).join(' | ') : '*(暫無隊員)*'}\n`;
        if ((status.partyCount || 1) >= 2) {
          partyRoster += `🟢 **二隊**：${status.party2 && status.party2.length > 0 ? status.party2.map((p: any) => `[${p.job}] ${p.ign}`).join(' | ') : '*(暫無隊員)*'}\n`;
        }
        if ((status.partyCount || 1) >= 3) {
          partyRoster += `🟣 **三隊**：${status.party3 && status.party3.length > 0 ? status.party3.map((p: any) => `[${p.job}] ${p.ign}`).join(' | ') : '*(暫無隊員)*'}\n`;
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

        const existingIdx = discordSignupsStore[raidId].findIndex(s => s.discordId === discordId);
        if (existingIdx >= 0) {
          discordSignupsStore[raidId][existingIdx] = signupRecord;
        } else {
          discordSignupsStore[raidId].push(signupRecord);
        }

        // Update raidStatusStore
        if (raidStatusStore[raidId]) {
          const currentYes = raidStatusStore[raidId].yesVotes || [];
          const vIdx = currentYes.findIndex((v: any) => v.discordId === discordId);
          const voterObj = {
            userId: `dc_${discordId}`,
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
          raidStatusStore[raidId].noVotes = (raidStatusStore[raidId].noVotes || []).filter((v: any) => v.discordId !== discordId);
          saveRaidStatuses();
        }

        return res.json({
          type: 4,
          data: {
            content: `🎉 **手動報名成功！**\n👤 **IGN**: \`${ign}\` \n🗡️ **職業**: \`${job}\` \n⭐ **等級**: \`Lv.${level}\` \n🤖 **Discord 帳號**: <@${discordId}>\n\n🟢 **出團意願已登記為「可以配合」！**\n*(💡 提示：您也可以登入網站設定您的專屬角色卡，下次點擊報名就能直接一鍵下拉選擇！)*`,
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
