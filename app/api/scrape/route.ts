import { NextRequest, NextResponse } from 'next/server';
import { chromium, Page } from 'playwright';

interface ScrapeRequest {
  postUrl: string;
  scrapeType: 'followers' | 'likes' | 'comments' | 'shares';
}

export async function POST(request: NextRequest) {
  const { postUrl, scrapeType }: ScrapeRequest = await request.json();
  console.log(`[START] Received request to scrape: ${scrapeType} from ${postUrl}`);
  
  let browser: any = null;
  try {
    // 1. Launch browser
    console.log('[1/6] Launching browser...');
    browser = await chromium.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--lang=en-US',
        '--disable-features=site-per-process',
        '--disable-web-security'
      ],
      timeout: 120000
    });
    console.log('✅ Browser launched successfully');

    // 2. Setup context
    console.log('[2/6] Creating new context...');
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 },
      locale: 'en-US',
      javaScriptEnabled: true
    });
    console.log('✅ Context created successfully');

    const page = await context.newPage();
    
    // 3. Navigate to post
    console.log(`[3/6] Navigating to post: ${postUrl}`);
    try {
      await page.goto(postUrl, {
        waitUntil: 'networkidle',
        timeout: 120000
      });
      console.log('✅ Post loaded successfully');
    } catch (gotoError) {
      console.warn('⚠️ Warning: Initial load failed, retrying...');
      await page.goto(postUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 90000
      });
      console.log('✅ Post loaded on second attempt');
    }
    
    // Verify core content appears
    await page.waitForSelector('article', { timeout: 90000 });
    console.log('✅ Core post content loaded');

    // 4. Extract data based on requested type
    console.log(`[4/6] Starting extraction: ${scrapeType}`);
    let usernames: string[] = [];
    
    switch (scrapeType) {
      case 'likes':
        usernames = await scrapeLikers(page);
        break;
      case 'comments':
        usernames = await scrapeCommenters(page);
        break;
      case 'followers':
        usernames = await scrapeFollowers(page);
        break;
      case 'shares':
        usernames = await scrapeSharers(page);
        break;
      default:
        throw new Error('Unsupported extraction type');
    }
    
    console.log(`✅ Extracted ${usernames.length} users`);
    
    // 5. Close browser
    console.log('[5/6] Closing browser...');
    await browser.close();
    console.log('✅ Browser closed');
    
    // 6. Return results
    console.log('[6/6] Returning results');
    return NextResponse.json({
      success: true,
      usernames,
      count: usernames.length,
      type: scrapeType
    });
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (browser) {
      console.log('⌛ Attempting to close browser after error...');
      await browser.close().catch(e => console.error('❌ Failed to close browser:', e));
    }
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to extract data',
      details: error.stack || 'No additional details'
    }, { status: 500 });
  }
}

// ============= Extraction Functions =============

async function scrapeLikers(page: Page): Promise<string[]> {
  console.log('🔄 Starting liker extraction...');
  try {
    // Open likes window
    console.log('🔍 Finding like button...');
    const likeButtonSelector = [
      'div._aamu:has-text("likes")',
      'button:has-text("likes")',
      'span:has-text("likes")'
    ].join(', ');
    
    await page.waitForSelector(likeButtonSelector, { timeout: 15000 });
    console.log('✅ Found like button');
    
    console.log('🖱️ Clicking like button...');
    await page.click(likeButtonSelector);
    
    console.log('⏳ Waiting for likes window...');
    await page.waitForSelector('div._aano', { timeout: 20000 });
    console.log('✅ Likes window appeared');
    
    // Extract usernames with scrolling
    console.log('🔄 Scrolling and extracting names...');
    const usernames = await scrollAndExtract(page, 'div._aano a._ap8a');
    
    console.log(`✅ Found ${usernames.length} likers`);
    return usernames;
  } catch (error) {
    console.error('❌ Error extracting likers:', error);
    throw error;
  }
}

async function scrapeCommenters(page: Page): Promise<string[]> {
  console.log('🔄 Starting commenter extraction...');
  try {
    // Scroll to load all comments
    console.log('🔄 Scrolling to load all comments...');
    const usernames = await scrollAndExtractComments(page);
    
    console.log(`✅ Found ${usernames.length} commenters`);
    return usernames;
  } catch (error) {
    console.error('❌ Error extracting commenters:', error);
    throw error;
  }
}

async function scrapeFollowers(page: Page): Promise<string[]> {
  console.log('🔄 Starting follower extraction...');
  try {
    // Find profile link
    console.log('🔍 Finding profile link...');
    const profileSelector = [
      'header a[href^="/"]',
      'header section a[href^="/"]',
      'header a[role="link"]'
    ].join(', ');
    
    await page.waitForSelector(profileSelector, { timeout: 15000 });
    const profileLink = await page.$(profileSelector);
    
    if (!profileLink) throw new Error('Profile link not found');
    
    const profileUrl = await profileLink.getAttribute('href');
    console.log(`📍 Found profile URL: ${profileUrl}`);
    
    // Go to followers page
    const followersUrl = `https://www.instagram.com${profileUrl}followers/`;
    console.log(`🌐 Navigating to followers: ${followersUrl}`);
    
    await page.goto(followersUrl, {
      waitUntil: 'networkidle',
      timeout: 90000
    });
    
    console.log('⏳ Waiting for followers list...');
    await page.waitForSelector('div._aano', { timeout: 30000 });
    console.log('✅ Followers list appeared');
    
    // Extract usernames with scrolling
    console.log('🔄 Scrolling and extracting followers...');
    const usernames = await scrollAndExtract(page, 'div._aano a._ap8a');
    
    console.log(`✅ Found ${usernames.length} followers`);
    return usernames;
  } catch (error) {
    console.error('❌ Error extracting followers:', error);
    throw error;
  }
}

async function scrapeSharers(page: Page): Promise<string[]> {
  console.log('🔄 Starting sharer extraction...');
  try {
    // Open share window
    console.log('🔍 Finding share button...');
    const shareButtonSelector = [
      'div._aam0:has-text("Share")',
      'button:has-text("Share")',
      'svg[aria-label="Share"]'
    ].join(', ');
    
    await page.waitForSelector(shareButtonSelector, { timeout: 15000 });
    console.log('✅ Found share button');
    
    console.log('🖱️ Clicking share button...');
    await page.click(shareButtonSelector);
    
    console.log('⏳ Waiting for share window...');
    await page.waitForSelector('div._aano', { timeout: 15000 });
    console.log('✅ Share window appeared');
    
    // Extract usernames
    console.log('🔍 Extracting sharers...');
    const usernames = await scrollAndExtract(page, 'div._aano a._ap8a');
    
    console.log(`✅ Found ${usernames.length} sharers`);
    return usernames;
  } catch (error) {
    console.error('❌ Error extracting sharers:', error);
    throw error;
  }
}

// ============= Helper Functions =============

async function scrollAndExtract(page: Page, selector: string): Promise<string[]> {
  console.log('⏫ Starting scroll extraction...');
  const usernames = new Set<string>();
  let previousCount = 0;
  let attempts = 0;
  const maxAttempts = 15;

  while (attempts < maxAttempts) {
    // Scroll down
    await page.evaluate(() => {
      const container = document.querySelector('div._aano');
      if (container) {
        container.scrollTop = container.scrollHeight;
        return container.scrollHeight;
      }
      return 0;
    });
    
    // Wait for new content to load
    await page.waitForTimeout(3000);
    
    // Extract current names
    const newUsers = await page.$$eval(selector, (elements) => 
      elements.map(el => el.getAttribute('href')?.replace('/', '') || '')
    );
    
    // Add new usernames
    const startCount = usernames.size;
    newUsers.forEach(user => {
      if (user) usernames.add(user);
    });
    const newCount = usernames.size - startCount;
    
    console.log(`📊 After scroll: ${usernames.size} users (${newCount} new)`);
    
    // Check if loading stopped
    if (usernames.size === previousCount) {
      attempts++;
      console.log(`🔄 No new users found (Attempt ${attempts}/${maxAttempts})`);
    } else {
      attempts = 0;
    }
    
    previousCount = usernames.size;
    
    // Break loop if no growth
    if (attempts >= 5) {
      console.log('⏹️ Stopping scroll after 5 attempts without additions');
      break;
    }
  }
  
  console.log(`⏹️ Scroll completed. Total users: ${usernames.size}`);
  return Array.from(usernames).filter(user => user.trim() !== '');
}

async function scrollAndExtractComments(page: Page): Promise<string[]> {
  console.log('⏫ Starting comment scroll...');
  const usernames = new Set<string>();
  let previousCount = 0;
  let attempts = 0;
  const maxAttempts = 15;

  while (attempts < maxAttempts) {
    // Scroll to bottom
    const newHeight = await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
      return document.body.scrollHeight;
    });
    
    await page.waitForTimeout(3000);
    
    // Extract commenters
    const newUsers = await page.$$eval('article ul li a:first-child', (anchors) => 
      anchors.map(a => {
        const href = a.getAttribute('href');
        return href ? href.replace('/', '') : '';
      })
    );
    
    // Add new usernames
    const startCount = usernames.size;
    newUsers.forEach(user => {
      if (user) usernames.add(user);
    });
    const newCount = usernames.size - startCount;
    
    console.log(`📊 After scroll: ${usernames.size} commenters (${newCount} new)`);
    
    if (usernames.size === previousCount) {
      attempts++;
      console.log(`🔄 No new comments found (Attempt ${attempts}/${maxAttempts})`);
    } else {
      attempts = 0;
    }
    
    previousCount = usernames.size;
    
    // Break loop if no growth
    if (attempts >= 5) {
      console.log('⏹️ Stopping scroll after 5 attempts without additions');
      break;
    }
  }
  
  console.log(`⏹️ Comment scroll completed. Total commenters: ${usernames.size}`);
  return Array.from(usernames).filter(user => user.trim() !== '');
}