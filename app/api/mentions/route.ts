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
  screenshots?: string[];
}

export async function POST(request: Request) {
  const { users, postUrl }: RequestBody = await request.json();
  const maxMentionsPerComment = 2; // تغيير إلى 4 مستخدمين لكل تعليق
  const totalUsers = users.length;
  let browser: any = null;
  let page: any = null;
  const verificationSteps: VerificationStep[] = [];
  const screenshots: string[] = [];

  try {
    console.log("Launching browser...");
    browser = await chromium.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--lang=en-US'
      ],
      timeout: 60000
    });

    console.log("Creating new context...");
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
      viewport: { width: 1280, height: 720 },
      locale: 'en-US'
    });

    page = await context.newPage();
    
    // تسجيل الدخول
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

    // الانتقال إلى المنشور
    verificationSteps.push({
      method: 'الذهاب إلى المنشور',
      success: true,
      message: `جاري الانتقال إلى المنشور: ${postUrl}`
    });
    
    await page.goto(postUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    console.log("✅ Post loaded successfully");
    verificationSteps.push({
      method: 'الذهاب إلى المنشور',
      success: true,
      message: 'تم تحميل المنشور بنجاح'
    });

    // التعامل مع التحذيرات
    try {
      const warning = await page.waitForSelector('text=/suspicious activity|automated behavior/i', { timeout: 10000 });
      
      if (warning) {
        console.log("⚠️ Warning detected, handling...");
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

    // تقسيم المستخدمين إلى مجموعات (كل مجموعة 4 مستخدمين)
    const userGroups: string[][] = [];
    for (let i = 0; i < totalUsers; i += maxMentionsPerComment) {
      userGroups.push(users.slice(i, i + maxMentionsPerComment));
    }

    const totalGroups = userGroups.length;
    let successfulComments = 0;

    console.log(`Processing ${totalGroups} comment groups...`);
    console.log(`Total users: ${totalUsers}`);
    console.log(`Users per comment: ${maxMentionsPerComment}`);

    // التعليق لكل مجموعة
    for (let groupIndex = 0; groupIndex < totalGroups; groupIndex++) {
      const group = userGroups[groupIndex];
      console.log(`\n--- Processing group ${groupIndex + 1}/${totalGroups} ---`);
      console.log(`Mentioning users: ${group.join(', ')}`);
      
      try {
        verificationSteps.push({
          method: 'بدء التعليق',
          success: true,
          message: `جاري التعليق بالمجموعة ${groupIndex + 1}/${totalGroups} (${group.length} مستخدمين)`
        });

        // البحث عن مربع التعليق
        console.log("Waiting for comment box...");
        await page.waitForSelector('textarea[aria-label="Add a comment…"]', { 
          timeout: 20000,
          state: 'visible'
        });
        
        const commentArea = await page.$('textarea[aria-label="Add a comment…"]');
        if (!commentArea) throw new Error('Comment box not found');
        
        await commentArea.click();
        console.log("Comment box focused");
        
        // كتابة التعليق
        console.log("Typing mentions...");
        for (const user of group) {
          await page.type('textarea[aria-label="Add a comment…"]', `@${user} `, { delay: 100 });
          await page.waitForTimeout(500);
          console.log(`Mentioned: @${user}`);
        }
        
        // إرسال التعليق
        console.log("Sending comment...");
        await page.keyboard.press('Enter');
        await page.waitForTimeout(5000);
        console.log("✅ Comment sent");
        
        // التحقق من النشر
        const commentSuccess = await verifyCommentPublished(page, group, verificationSteps);
        
        if (commentSuccess) {
          successfulComments++;
          verificationSteps.push({
            method: 'إرسال التعليق',
            success: true,
            message: `تم نشر التعليق للمجموعة ${groupIndex + 1}/${totalGroups}`
          });
          
          const screenshot = await captureScreenshot(page);
          if (screenshot) screenshots.push(screenshot);
        } else {
          verificationSteps.push({
            method: 'إرسال التعليق',
            success: false,
            message: `فشل التحقق من نشر التعليق للمجموعة ${groupIndex + 1}/${totalGroups}`
          });
        }

        // انتظار عشوائي بين التعليقات
        const randomWait = Math.floor(Math.random() * 5000) + 5000;
        console.log(`Waiting ${randomWait/1000} seconds before next comment...`);
        await page.waitForTimeout(randomWait);

      } catch (groupError: any) {
        console.error(`❌ Error in group ${groupIndex + 1}: ${groupError.message}`);
        verificationSteps.push({
          method: 'معالجة المجموعة',
          success: false,
          message: `خطأ في المجموعة ${groupIndex + 1}: ${groupError.message}`
        });
      }
    }

    // النتيجة النهائية
    console.log(`\nProcessing completed!`);
    console.log(`Successful comments: ${successfulComments}/${totalGroups}`);
    
    if (successfulComments > 0) {
      return NextResponse.json({ 
        message: `تم نشر ${successfulComments}/${totalGroups} تعليقات بنجاح!`,
        details: `تمت معالجة ${totalUsers} مستخدم`,
        verificationSteps,
        screenshots
      });
    } else {
      throw new Error('Failed to publish all comments');
    }

  } catch (error: any) {
    console.error(`❌ Global error: ${error.message}`);
    verificationSteps.push({
      method: 'المعالجة العامة',
      success: false,
      message: error.message || 'حدث خطأ غير معروف'
    });
    
    const screenshot = await captureScreenshot(page);
    if (screenshot) screenshots.push(screenshot);
    
    return NextResponse.json({ 
      message: `حدث خطأ: ${error.message || 'فشل في نشر التعليقات'}`,
      verificationSteps,
      screenshots
    }, { 
      status: 500 
    });
    
  } finally {
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    console.log("Browser closed");
  }
}

async function verifyCommentPublished(page: any, users: string[], steps: VerificationStep[]): Promise<boolean> {
  try {
    console.log("Verifying comment publication...");
    
    // التحقق من إفراغ مربع التعليق
    const commentValue = await page.$eval('textarea[aria-label="Add a comment…"]', (el: HTMLTextAreaElement) => el.value);
    
    if (commentValue === '') {
      console.log("✅ Comment box cleared");
      steps.push({
        method: 'التحقق من نشر التعليق',
        success: true,
        message: 'تم إفراغ مربع التعليق بعد النشر'
      });
      return true;
    }
    
    // التحقق من ظهور التعليق
    const commentSelector = users.map(user => `:has-text("${user}")`).join('');
    await page.waitForSelector(`div[role="dialog"] ${commentSelector}`, { timeout: 10000 });
    
    console.log("✅ Comment visible in post");
    steps.push({
      method: 'التحقق من نشر التعليق',
      success: true,
      message: 'تم العثور على التعليق في المنشور'
    });
    return true;
    
  } catch (error: any) {
    console.error(`❌ Verification failed: ${error.message}`);
    steps.push({
      method: 'التحقق من نشر التعليق',
      success: false,
      message: `فشل التحقق: ${error.message}`
    });
    return false;
  }
}

async function captureScreenshot(page: any): Promise<string | null> {
  if (!page) return null;
  try {
    console.log("Capturing screenshot...");
    const screenshotBuffer = await page.screenshot({ fullPage: true });
    return screenshotBuffer.toString('base64');
  } catch (error) {
    console.error("Failed to capture screenshot");
    return null;
  }
}