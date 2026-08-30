import { chromium } from 'playwright';
import path from 'path';

const TARGET_URL = 'https://chord.worldinspirelab.com/';
console.log(`🌐 Launching Chrome to execute multi-progression interactive E2E tests on ${TARGET_URL}...`);

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

  // 2. Test 6-4-1-5 Chip Click
  console.log(`🚀 Step 2: Clicking '6-4-1-5 (伤感六四一五)' preset chip...`);
  await page.click('.chip[data-prog="6,4,1,5"]');
  await page.waitForTimeout(600);

  const prog6415Title = await page.textContent('#progression-name-title');
  const count6415 = await page.textContent('#total-songs-count');
  console.log(`   Progression Title: "${prog6415Title}", Hits: ${count6415}`);
  if (!prog6415Title.includes('六四一五')) {
    throw new Error(`Expected 6415 title, got: ${prog6415Title}`);
  }

  // 3. Test 4-5-3-6-2-5-1 (王道进行) Chip Click
  console.log(`🚀 Step 3: Clicking '4-5-3-6-2-5-1 (王道进行)' preset chip...`);
  await page.click('.chip[data-prog="4,5,3,6,2,5,1"]');
  await page.waitForTimeout(600);

  const progRoyalTitle = await page.textContent('#progression-name-title');
  const countRoyal = await page.textContent('#total-songs-count');
  console.log(`   Progression Title: "${progRoyalTitle}", Hits: ${countRoyal}`);
  if (!progRoyalTitle.includes('王道进行')) {
    throw new Error(`Expected 王道进行 title, got: ${progRoyalTitle}`);
  }

  // 4. Test Keyword Search for '青花瓷' (Jay Chou)
  console.log(`🚀 Step 4: Typing '青花瓷' into search bar...`);
  await page.fill('#input-progression', '青花瓷');
  await page.click('#btn-search');
  await page.waitForTimeout(600);

  const firstSongTitle = await page.textContent('#songs-tbody tr:first-child .song-title');
  const firstSongProg = await page.textContent('#songs-tbody tr:first-child td:nth-child(4)');
  console.log(`   Matched Song: "${firstSongTitle.trim()}", Progression: "${firstSongProg.trim().replace(/\s+/g, ' ')}"`);
  if (!firstSongTitle.includes('青花瓷') || !firstSongProg.includes('4,5,3,6,2,5,1')) {
    throw new Error(`Expected 青花瓷 with 4,5,3,6,2,5,1, got ${firstSongTitle} / ${firstSongProg}`);
  }

  // 5. Test Keyword Search for '北京北京' (Wang Feng 6415)
  console.log(`🚀 Step 5: Typing '北京北京' into search bar...`);
  await page.fill('#input-progression', '北京北京');
  await page.click('#btn-search');
  await page.waitForTimeout(600);

  const bjSongTitle = await page.textContent('#songs-tbody tr:first-child .song-title');
  const bjSongProg = await page.textContent('#songs-tbody tr:first-child td:nth-child(4)');
  console.log(`   Matched Song: "${bjSongTitle.trim()}", Progression: "${bjSongProg.trim().replace(/\s+/g, ' ')}"`);
  if (!bjSongTitle.includes('北京北京') || !bjSongProg.includes('6,4,1,5')) {
    throw new Error(`Expected 北京北京 with 6,4,1,5, got ${bjSongTitle} / ${bjSongProg}`);
  }

  // 6. Test Chord Sheet Decoder with 'F G Em Am Dm G C'
  console.log(`🚀 Step 6: Testing Chord Sheet Decoder with 'F G Em Am Dm G C'...`);
  await page.fill('#custom-chords-input', 'F G Em Am Dm G C');
  await page.click('#btn-custom-analyze');
  await page.waitForSelector('#custom-analysis-result div', { state: 'attached', timeout: 5000 });

  const decodeText = await page.textContent('#custom-analysis-result');
  console.log(`   Decoder Output:\n${decodeText.trim()}`);

  if (!decodeText.includes('IV - V - iii - vi - ii - V - I') && !decodeText.includes('4,5,3,6,2,5,1')) {
    throw new Error(`Decoder failed to produce Roman progression: ${decodeText}`);
  }

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
  console.log(`🎉 ALL MULTI-PROGRESSION CHROME E2E TESTS PASSED 100%!`);
})();
