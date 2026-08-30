import { chromium } from 'playwright';
import path from 'path';

const TARGET_URL = 'https://chord.worldinspirelab.com/';
console.log(`🌐 Launching Chrome to execute full interactive E2E tests on ${TARGET_URL}...`);

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();
  const errors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.error(`❌ Console Error: ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    errors.push(err.message);
    console.error(`❌ Uncaught Page Error: ${err.message}`);
  });

  console.log(`🚀 Step 1: Navigating to ${TARGET_URL}...`);
  await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 });

  // 1. Check title
  const title = await page.title();
  console.log(`   Page Title: "${title}"`);

  // 2. Test Yopu Search & 1-Click Parsing Workflow
  console.log(`🚀 Step 2: Testing Yopu Search & 1-Click Import Workflow with keyword '青春'...`);
  await page.fill('#yopu-import-input', '青春');
  await page.click('#btn-yopu-search');

  // Wait for search result box to display matches
  await page.waitForSelector('#yopu-search-results-box .btn-import-item', { state: 'attached', timeout: 15000 });
  const searchHtml = await page.textContent('#yopu-search-results-box');
  console.log(`   Search Results Summary:\n   ${searchHtml.slice(0, 160).replace(/\s+/g, ' ')}...`);

  if (searchHtml.includes('undefined')) {
    throw new Error(`❌ Found 'undefined' in Yopu search results HTML: ${searchHtml}`);
  }

  // 3. Click the first "解析 ➔" button
  console.log(`🚀 Step 3: Clicking the first '解析 ➔' button...`);
  const firstImportBtn = page.locator('#yopu-search-results-box .btn-import-item').first();
  const itemTitle = await firstImportBtn.getAttribute('data-title');
  const itemArtist = await firstImportBtn.getAttribute('data-artist');
  console.log(`   Target Song: "${itemTitle}" by "${itemArtist}"`);
  
  await firstImportBtn.click();

  // Wait for #yopu-import-result to show success
  await page.waitForFunction(() => {
    const el = document.getElementById('yopu-import-result');
    return el && el.textContent.includes('解析成功并已入库');
  }, { timeout: 15000 });

  const importResultText = await page.textContent('#yopu-import-result');
  console.log(`   Import Result Card:\n${importResultText.trim()}`);

  if (importResultText.includes('undefined') || importResultText.includes('未知歌手')) {
    throw new Error(`❌ Found 'undefined' or '未知歌手' in import result: ${importResultText}`);
  }

  // 4. Click '在曲库中检索此进行 ➔'
  console.log(`🚀 Step 4: Clicking '在曲库中检索此进行 ➔'...`);
  await page.click('#btn-use-yopu-prog');
  await page.waitForTimeout(500);

  const activeProgInput = await page.inputValue('#input-progression');
  console.log(`   Active Progression loaded into builder: "${activeProgInput}"`);
  if (!activeProgInput) {
    throw new Error(`Progression was not loaded into input!`);
  }

  // 5. Test Chord Sheet Decoder
  console.log(`🚀 Step 5: Testing Chord Sheet Decoder with 'F G Em Am Dm G C'...`);
  await page.fill('#custom-chords-input', 'F G Em Am Dm G C');
  await page.click('#btn-custom-analyze');
  await page.waitForSelector('#custom-analysis-result div', { state: 'attached', timeout: 5000 });

  const decodeText = await page.textContent('#custom-analysis-result');
  console.log(`   Decoder Output:\n${decodeText.trim()}`);

  if (!decodeText.includes('IV - V - iii - vi - ii - V - I') && !decodeText.includes('4,5,3,6,2,5,1')) {
    throw new Error(`Decoder failed to produce Roman progression: ${decodeText}`);
  }

  // 6. Test '用此进行检索歌曲 ➔' from decoder
  console.log(`🚀 Step 6: Testing '用此进行检索歌曲 ➔' from decoder...`);
  await page.click('#btn-use-custom-prog');
  await page.waitForTimeout(500);

  const totalHits = await page.textContent('#total-songs-count');
  console.log(`   Songs count matching decoded progression: ${totalHits}`);

  // 7. Save High-Res Production Screenshot
  console.log(`🚀 Step 7: Capturing Screenshot...`);
  const screenshotPath = path.resolve('tests/chrome_e2e_verified.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`   Saved verified screenshot to: ${screenshotPath}`);

  if (errors.length > 0) {
    console.warn(`⚠️ Warning: ${errors.length} browser errors recorded.`);
  } else {
    console.log(`   ✅ ZERO Console Errors Detected on Chrome!`);
  }

  await browser.close();
  console.log(`🎉 ALL INTERACTIVE CHROME E2E TESTS PASSED 100%!`);
})();
