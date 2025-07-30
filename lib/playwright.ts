
import { chromium} from 'playwright';
import { waitForVerificationCode } from './email';

export async function registerInstagram( email: string, fullName: string, password: string,token: string,proxy?: string) {
  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--lang=en-US',
    '--window-size=1280,800',
  ];

  if (proxy) {
    args.push(`--proxy-server=${proxy}`);
  }

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false,
    args,
    timeout: 60000,
    slowMo: 300,
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'en-US',
    timezoneId: 'America/New_York',
  });

  // ✅ تقنيات التمويه الأساسية
  await context.addInitScript(() => {
    // إخفاء Playwright
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });

    // إعداد اللغة
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });

    // وهم وجود إضافات
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4],
    });

    // وهم وجود WebGL
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (parameter) {
      if (parameter === 37445) return 'NVIDIA'; // UNMASKED_VENDOR_WEBGL
      if (parameter === 37446) return 'NVIDIA GeForce RTX 3080'; // UNMASKED_RENDERER_WEBGL
      return getParameter(parameter);
    };
  });

  const page = await context.newPage();

  await page.goto('https://www.instagram.com/accounts/emailsignup/',{ waitUntil: 'load',
  timeout: 60000},);
  await page.waitForTimeout(3000); // انتظار تحميل الصفحة

  // تعبئة البيانات مع delay
  await page.type('input[name="emailOrPhone"]', email, { delay: 150 });
  await page.waitForTimeout(1000);
   await page.type('input[name="fullName"]', fullName, { delay: 150 });
  await page.waitForTimeout(1000);
    // الخطوة 1: اكتب اسم مستخدم غير متاح
await page.type('input[aria-label="Username"]', fullName,{ delay: 150 });
// انتظر حتى يظهر زر "refresh suggestion"
  await page.waitForTimeout(3000);

const refreshButton = await page.$('button:has-text("refresh suggestion")');
if (refreshButton) {
  await refreshButton.click();
} else {
  // أحيانًا يكون الزر مجرد svg بداخل زر، نجرب css أكثر مرونة
  const maybeIcon = await page.$('button svg[aria-label="Refresh suggestion"], button[title="Refresh suggestion"]');
  if (maybeIcon) {
    const parentBtn = await maybeIcon.evaluateHandle(el => el.closest('button'));
    if (parentBtn) {
      await parentBtn.asElement()?.click();
    }
  } else {
    console.log("❌ لم يتم العثور على الزر Refresh suggestion بأي طريقة.");
  }
}
  await page.waitForTimeout(1000);

 
    await page.type('input[name="password"]', password, { delay: 150 });

  await page.waitForTimeout(2000);

  await page.click('button[type="submit"]');

  // الانتظار حتى تظهر صفحة اختيار تاريخ الميلاد
await page.waitForSelector('text=Add Your Birthday');
await page.locator('select').nth(0).selectOption({ value: '6' });  // July → رقم 6 لأن الشهر يبدأ من 0 أو 1 حسب Instagram
await page.waitForTimeout(800)
await page.locator('select').nth(1).selectOption({ value: '15' }); // اليوم 15
await page.waitForTimeout(800)
await page.locator('select').nth(2).selectOption({ value: '1996' }); // السنة
  await page.waitForTimeout(2000);

// الضغط على زر "Next"
await page.click('button:has-text("Next")');
  await page.waitForTimeout(1000);
  // تأكد من أنك في صفحة تأكيد الإيميل

await page.waitForSelector('input[name="email_confirmation_code"]', { timeout: 10000 });
const code = await waitForVerificationCode(token);
  await page.waitForTimeout(5000);

await page.fill('input[name="email_confirmation_code"]', code);
await page.click('button:has-text("Next")');
  await page.waitForTimeout(2000);

 // await browser.close();
}
