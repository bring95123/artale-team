import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

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
