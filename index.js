
const express = require("express");
const makeWASocket = require("@whiskeysockets/baileys").default;
const { useSingleFileAuthState } = require("@whiskeysockets/baileys/lib/store");
const qrcode = require("qrcode-terminal");
const fs = require("fs");

const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());

const sessions = {};

app.get("/qr/:sessionId", async (req, res) => {
  const sessionId = req.params.sessionId;
  const authFile = `./${sessionId}.json`;
  const { state, saveState } = useSingleFileAuthState(authFile);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
  });

  sock.ev.on("connection.update", (update) => {
    const { connection, qr } = update;
    if (qr) {
      qrcode.generate(qr, { small: true });
    }
    if (connection === "open") {
      console.log(`✅ Sessão ${sessionId} conectada`);
    }
  });

  sock.ev.on("creds.update", saveState);
  sessions[sessionId] = sock;

  res.send(`📲 Escaneie o QR code no terminal para a sessão: ${sessionId}`);
});

app.post("/send/:sessionId", async (req, res) => {
  const sessionId = req.params.sessionId;
  const { number, message } = req.body;

  const sock = sessions[sessionId];
  if (!sock) {
    return res.status(400).send("Sessão não conectada. Escaneie o QR primeiro.");
  }

  try {
    const jid = number.includes("@s.whatsapp.net") ? number : number + "@s.whatsapp.net";
    await sock.sendMessage(jid, { text: message });
    res.send("Mensagem enviada com sucesso.");
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao enviar mensagem.");
  }
});

app.listen(port, () => {
  console.log(`🚀 Servidor rodando na porta ${port}`);
});
