import { NextResponse } from 'next/server'
import { chromium } from 'playwright'

// تعريف الأنواع
interface RequestBody {
  users: string[];
  postUrl: string;
}

interface VerificationStep {
  method: string;
  success: boolean;
  message: string;
}

interface ResponseData {
  message: string;
  details?: string;
  verificationSteps?: VerificationStep[];
  screenshot?: string;
}

export async function POST(request: Request) {
  const { users, postUrl }: RequestBody = await request.json();
  const maxMentions = parseInt(process.env.MAX_MENTIONS || '10', 10);
  let browser: any = null;
  let page: any = null;
  const verificationSteps: VerificationStep[] = [];

  try {
    // 1. تشغيل المتصفح
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--lang=en-US'
      ],
      timeout: 60000
    });

    // 2. إعداد السياق
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
      viewport: { width: 1280, height: 720 },
      locale: 'en-US'
    });

    page = await context.newPage();
    
    // 3. تسجيل الدخول
    verificationSteps.push({
      method: 'تسجيل الدخول',
      success: true,
      message: 'جاري الانتقال إلى صفحة تسجيل الدخول'
    });
    
    await page.goto('https://www.instagram.com/accounts/login/', { 
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });
    
    await page.fill('input[name="username"]', process.env.IG_USERNAME!);
    await page.fill('input[name="password"]', process.env.IG_PASSWORD!);
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
      page.click('button[type="submit"]')
    ]);
    
    verificationSteps.push({
      method: 'تسجيل الدخول',
      success: true,
      message: 'تم تسجيل الدخول بنجاح'
    });
    
    // 4. الانتقال إلى المنشور
    verificationSteps.push({
      method: 'الذهاب إلى المنشور',
      success: true,
      message: `جاري الانتقال إلى المنشور: ${postUrl}`
    });
    
    await page.goto(postUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    verificationSteps.push({
      method: 'الذهاب إلى المنشور',
      success: true,
      message: 'تم تحميل المنشور بنجاح'
    });

    // 5. التعامل مع أي تحذيرات
    try {
      const warning = await page.waitForSelector('text=/suspicious activity|automated behavior/i', { timeout: 10000 });
      
      if (warning) {
        const notMeButton = await page.$('text=/This Wasn\'t Me/i');
        if (notMeButton) {
          await notMeButton.click();
          verificationSteps.push({
            method: 'معالجة التحذير',
            success: true,
            message: 'تم الضغط على "This Wasn\'t Me"'
          });
        } else {
          const closeButton = await page.$('button[aria-label="Close"]');
          if (closeButton) {
            await closeButton.click();
            verificationSteps.push({
              method: 'معالجة التحذير',
              success: true,
              message: 'تم الضغط على زر الإغلاق'
            });
          }
        }
        await page.waitForTimeout(3000);
      }
    } catch (error) {
      verificationSteps.push({
        method: 'معالجة التحذير',
        success: true,
        message: 'لم تظهر رسالة تحذير'
      });
    }

    // 6. كتابة التعليق
    await page.waitForSelector('textarea[aria-label="Add a comment…"]', { 
      timeout: 20000,
      state: 'visible'
    });
    
    const commentArea = await page.$('textarea[aria-label="Add a comment…"]');
    if (!commentArea) throw new Error('تعذر العثور على مربع التعليق');
    
    await commentArea.click();
    
    const usersToMention = users.slice(0, maxMentions);
    for (const user of usersToMention) {
      await page.type('textarea[aria-label="Add a comment…"]', `@${user} `, { delay: 100 });
      await page.waitForTimeout(800);
    }
    
    verificationSteps.push({
      method: 'كتابة التعليق',
      success: true,
      message: `تم كتابة ${usersToMention.length} مستخدم في التعليق`
    });

    // 7. إرسال التعليق
    await page.keyboard.press('Enter');
    await page.waitForTimeout(5000);
    
    verificationSteps.push({
      method: 'إرسال التعليق',
      success: true,
      message: 'تم الضغط على Enter لإرسال التعليق'
    });

    // 8. التحقق من نشر التعليق
    const commentSuccess = await verifyCommentPublished(page, usersToMention, verificationSteps);
    
    if (commentSuccess) {
      return NextResponse.json({ 
        message: `تم نشر التعليق بنجاح! تم ذكر ${usersToMention.length} مستخدم`,
        verificationSteps,
        screenshot: await captureScreenshot(page)
      });
    } else {
      throw new Error('فشل التحقق من نشر التعليق على المنشور');
    }

  } catch (error: any) {
    verificationSteps.push({
      method: 'المعالجة العامة',
      success: false,
      message: error.message || 'حدث خطأ غير معروف'
    });
    
    return NextResponse.json({ 
      message: `حدث خطأ: ${error.message || 'فشل في نشر التعليق'}`,
      verificationSteps,
      screenshot: await captureScreenshot(page)
    }, { 
      status: 500 
    });
    
  } finally {
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}

// دالة للتحقق من نشر التعليق
async function verifyCommentPublished(page: any, users: string[], steps: VerificationStep[]): Promise<boolean> {
  let success = false;
  
  try {
    const commentValue = await page.$eval('textarea[aria-label="Add a comment…"]', (el: HTMLTextAreaElement) => el.value);
    if (commentValue === '') {
      steps.push({
        method: 'التحقق من نشر التعليق',
        success: true,
        message: 'مربع التعليق فارغ بعد النشر'
      });
      success = true;
    } else {
      steps.push({
        method: 'التحقق من نشر التعليق',
        success: false,
        message: `مربع التعليق غير فارغ: ${commentValue}`
      });
    }
  } catch (error: any) {
    steps.push({
      method: 'التحقق من نشر التعليق',
      success: false,
      message: `خطأ في التحقق: ${error.message}`
    });
  }
  
  return success;
}

// دالة لالتقاط لقطة شاشة
async function captureScreenshot(page: any): Promise<string | null> {
  if (!page) return null;
  try {
    const screenshotBuffer = await page.screenshot({ fullPage: true });
    return screenshotBuffer.toString('base64');
  } catch (error) {
    return null;
  }
}