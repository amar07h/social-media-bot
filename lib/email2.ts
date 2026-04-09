import { setTimeout as wait } from "timers/promises";
import imaps from "imap-simple";

const config = {
  imap: {
    user: process.env.GMAIL_USER!,
    password: process.env.GMAIL_APP_PASSWORD!,
    host: "imap.gmail.com",
    port: 993,
    tls: true,
    authTimeout: 5000,
    tlsOptions: { rejectUnauthorized: false },
  },
};

async function checkInbox() {
  const connection = await imaps.connect({ imap: config.imap });
  await connection.openBox("INBOX");

  const searchCriteria = ["UNSEEN"];
  const fetchOptions = { bodies: ["HEADER.FIELDS (FROM TO SUBJECT DATE)", "TEXT"], markSeen: false };

  const messages = await connection.search(searchCriteria, fetchOptions);
  await connection.end();
  return messages;
}

export async function waitForActivationEmail(maxAttempts = 12, intervalMs = 5000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`🔎 Checking inbox (try ${attempt}/${maxAttempts})...`);
    const messages = await checkInbox();

    if (messages.length > 0) {
      const parts = messages[0].parts;
      const textPart = parts.find((p) => p.which === "TEXT");
      const body = (textPart?.body as string) || "";
      const match = body.match(/https?:\/\/[^\s'"]+/);
      return match ? match[0] : null;
    }

    // لو ما فيه رسائل، انتظر
    if (attempt < maxAttempts) await wait(intervalMs);
  }
  return null;
}
