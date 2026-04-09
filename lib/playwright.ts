import { chromium, Page } from 'playwright';
import { waitForActivationEmail } from '@/lib/email2';

/* =========================
   🧠 Smart IG Field Filler
========================= */

type FillFieldOptions = {
  page: Page;
  label: RegExp;
  value: string;
  type?: 'text' | 'password' | 'numeric';
  delay?: [number, number];
};

async function fillIGField({
  page,
  label,
  value,
  type = 'text',
  delay = [80, 160],
}: FillFieldOptions): Promise<boolean> {
  const strategies: (() => any)[] = [];

  // 1️⃣ by label (best)
  strategies.push(() => page.getByLabel(label));

  // 2️⃣ by role / type
  if (type === 'password') {
    strategies.push(() => page.locator('input[type="password"]'));
  } else if (type === 'numeric') {
    strategies.push(() => page.locator('input[inputmode="numeric"]'));
  } else {
    strategies.push(() =>
      page.getByRole('textbox', { name: label })
    );
  }

  // 3️⃣ fallback
  strategies.push(() => page.locator('input').first());

  for (const getEl of strategies) {
    try {
      const el = getEl();
      if (await el.count()) {
        await el.first().scrollIntoViewIfNeeded();
        await el.first().click();
        await el.first().fill('');
        await el.first().type(value, {
          delay:
            Math.random() * (delay[1] - delay[0]) + delay[0],
        });
        return true;
      }
    } catch {}
  }

  console.warn(`❌ Field not found: ${label}`);
  return false;
}

/* =========================
   🎂 Birthday (NEW UI)
========================= */

async function fillBirthdaySinglePage(
  page: Page,
) {
  const pick = async (label: RegExp, value: string) => {
  const combo = page.getByRole('combobox', { name: label });

  await combo.waitFor({ state: 'visible' });
  await combo.click();

  const option = page.getByRole('option', { name: value });
  await option.waitFor({ state: 'visible' });
  await option.click();
};

 // Month
await pick(/month/i, 'July');

// Day
await pick(/day/i, '15');

// Year
await pick(/year/i, '1996');
}

/* =========================
   🧠 Helpers
========================= */

const humanDelay = (page: Page, min: number, max: number) =>
  page.waitForTimeout(
    Math.floor(Math.random() * (max - min + 1) + min)
  );

/* =========================
   🚀 Main Register Function
========================= */

export async function registerInstagram(
  email: string,
  fullName: string,
  password: string,
  proxy?: string
) {
  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--lang=en-US',
    '--window-size=1280,800',
  ];

  if (proxy) args.push(`--proxy-server=${proxy}`);

  const browser = await chromium.launch({
    executablePath:
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false,
    slowMo: 350,
    args,
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 768 },
    locale: 'en-US',
    timezoneId: 'America/New_York',
  });

  // basic stealth
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
  });

  const page = await context.newPage();

  await page.goto(
    'https://www.instagram.com/accounts/emailsignup/',
    { waitUntil: 'load' }
  );

  await humanDelay(page, 1200, 2000);

  /* =========================
     ✍️ ONE-PAGE SIGNUP FLOW
  ========================= */

  // Email
  await fillIGField({
    page,
    label: /mobile|email/i,
    value: email,
  });

  await humanDelay(page, 400, 800);

  // Password
  await fillIGField({
    page,
    label: /password/i,
    value: password,
    type: 'password',
  });

  await humanDelay(page, 400, 800);
// Full name
  await fillIGField({
    page,
    label: /full name|name/i,
    value: fullName,
  });
 await humanDelay(page, 800, 1200);
  // 🎂 Birthday (same page)
  await fillBirthdaySinglePage(
    page
  );

  await humanDelay(page, 600, 1500);

  // Username
 /*  await fillIGField({
    page,
    label: /username/i,
    value: fullName.replace(/\s+/g, '').toLowerCase(),
  });
 */
 
  await humanDelay(page, 400, 800);

  

  // Submit
  await page.getByRole('button', {
    name: /submit|get started/i,
  }).click();

  /* =========================
     📩 Email Verification
  ========================= */

  await page.waitForSelector('input[inputmode="numeric"]', {
    timeout: 20000,
  });

  const activationLink = await waitForActivationEmail();

  if (activationLink) {
    console.log('✅ Activation link:', activationLink);
    // await page.goto(activationLink);
  } else {
    console.log('❌ No activation email found');
  }

  await humanDelay(page, 3000, 5000);

  // await browser.close();
}
