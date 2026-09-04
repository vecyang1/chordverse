import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const TARGET_URL = 'https://chord.worldinspirelab.com/';
console.log(`🌐 Launching Headless Chromium to test production URL: ${TARGET_URL}...`);

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();
  const consoleErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.error(`❌ Console Error: ${msg.text()}`);
    } else {
      console.log(`[Browser Console] ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
    console.error(`❌ Page Uncaught Exception: ${err.message}`);
  });

  console.log(`🚀 Step 1: Navigating to ${TARGET_URL}...`);
  const response = await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 });
  console.log(`   HTTP Status: ${response.status()}`);
  if (response.status() !== 200) {
    throw new Error(`Expected HTTP 200, got ${response.status()}`);
  }

  // 1. Verify Page Title and Branding
  const title = await page.title();
  console.log(`   Page Title: "${title}"`);
  if (!title.includes('ChordVerse')) {
    throw new Error(`Page title does not contain 'ChordVerse'`);
  }

  // Wait for initial data hydration
  await page.waitForFunction(() => {
    const totalEl = document.getElementById('total-songs-count');
    return totalEl && parseInt(totalEl.textContent, 10) > 0;
  }, { timeout: 10000 });

  const initialHits = await page.textContent('#total-songs-count');
  console.log(`   Initial Hits Rendered: ${initialHits}`);

  // 2. Test Preset Buttons (.chip)
  console.log(`🚀 Step 2: Testing Preset Progression Switchers (.chip)...`);
  const presets = [
    { prog: '6,4,1,5', expectedTitle: '六四一五' },
    { prog: '4,5,3,6,2,5,1', expectedTitle: '王道进行' },
    { prog: '1,5,6,3,4,1,2,5', expectedTitle: '卡农进行' },
    { prog: '1,6,4,5', expectedTitle: '50年代' },
    { prog: '2,5,1', expectedTitle: '爵士' },
    { prog: '1,5,6,4', expectedTitle: '流行四和弦' }
  ];

  for (const preset of presets) {
    const btn = page.locator(`.chip[data-prog="${preset.prog}"]`);
    // Wait for the edge round-trip (0.4-2 s live) instead of a fixed sleep.
    await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/search?') && r.status() === 200, { timeout: 20000 }),
      btn.click()
    ]);
    await page.waitForFunction(() => {
      const t = document.querySelector('#progression-name-title')?.textContent || '';
      return t.length > 0 && !t.includes('检索中');
    }, null, { timeout: 20000 });
    const progTitle = await page.textContent('#progression-name-title');
    console.log(`   Clicked chip [${preset.prog}] -> Progression Title: "${progTitle}"`);
    if (!progTitle.includes(preset.expectedTitle)) {
      throw new Error(`Expected progression title to contain "${preset.expectedTitle}", got "${progTitle}"`);
    }
  }

  // 3. Test Key Transposition Select
  console.log(`🚀 Step 3: Testing Key Transposition Selector...`);
  const keySelect = page.locator('#play-key-select');
  await keySelect.selectOption('G');
  await page.waitForTimeout(300);
  const refKeysText = await page.textContent('#ref-keys-box');
  console.log(`   Transposed -> Reference Box: "${refKeysText.trim()}"`);

  // 4. Test Step Builder Buttons
  console.log(`🚀 Step 4: Testing Step Builder Buttons...`);
  await page.locator('#btn-clear').click();
  await page.waitForTimeout(200);

  await page.locator('.chord-btn[data-degree="1"]').click();
  await page.locator('.chord-btn[data-degree="5"]').click();
  await page.locator('.chord-btn[data-degree="6"]').click();
  await page.locator('.chord-btn[data-degree="4"]').click();
  await page.waitForTimeout(200);

  const customInputVal = await page.inputValue('#input-progression');
  console.log(`   Built Progression Input: "${customInputVal}"`);
  if (customInputVal !== '1,5,6,4') {
    throw new Error(`Expected input '1,5,6,4', got '${customInputVal}'`);
  }

  // 5. Test Chord Sheet Decoder
  console.log(`🚀 Step 5: Testing Chord Sheet Decoder...`);
  await page.fill('#custom-chords-input', 'F G Em Am Dm G C');
  await page.locator('#btn-custom-analyze').click();
  await page.waitForSelector('#custom-analysis-result:not(:empty)', { timeout: 5000 });
  const decodeOutput = await page.textContent('#custom-analysis-result');
  console.log(`   Chord Sheet Decode Result:\n${decodeOutput.trim()}`);
  if (!decodeOutput.includes('IV - V - iii - vi - ii - V - I') && !decodeOutput.includes('4,5,3,6,2,5,1')) {
    throw new Error(`Decode output does not contain expected Roman progression: "${decodeOutput}"`);
  }

  // 6. Test Yopu Search Input
  console.log(`🚀 Step 6: Testing Yopu Score Search Engine UI...`);
  await page.fill('#yopu-import-input', '再见青春');
  await page.locator('#btn-yopu-search').click();
  await page.waitForFunction(() => {
    const box = document.querySelector('#yopu-search-results-box');
    return box && box.textContent.trim().length > 0 && !box.querySelector('.loading-spinner');
  }, null, { timeout: 20000 });
  const yopuResultText = await page.textContent('#yopu-search-results-box');
  const yopuRows = await page.locator('#yopu-search-results-box .yopu-result-row').count();
  const yopuFallback = (await page.locator('#yopu-search-results-box .yopu-fallback-note').count()) > 0;
  console.log(`   Yopu Search Output Summary: ${yopuResultText.slice(0, 150).replace(/\s+/g, ' ')}...`);
  console.log(`   Yopu rows rendered: ${yopuRows} (${yopuFallback ? 'local corpus fallback' : 'live Yopu'})`);
  if (yopuRows === 0 || /搜索失败|未找到/.test(yopuResultText)) {
    throw new Error(`Yopu search rendered no usable results: ${yopuResultText.slice(0, 200)}`);
  }

  // 7. Test Export Modals / Buttons
  console.log(`🚀 Step 7: Testing CSV & Markdown Exporters...`);
  await page.locator('#btn-export-csv').click();
  await page.locator('#btn-export-md').click();
  console.log(`   Export triggers executed cleanly.`);

  // 8. Capture High-Resolution Screenshot
  console.log(`🚀 Step 8: Capturing Production Full-Page Screenshot...`);
  const screenshotPath = path.resolve('tests/production_e2e_screenshot.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`   Screenshot saved to: ${screenshotPath}`);

  // 9. Check Console Errors
  console.log(`🚀 Step 9: Auditing Browser Console Errors...`);
  if (consoleErrors.length > 0) {
    console.warn(`⚠️ Warning: Detected ${consoleErrors.length} console errors:`, consoleErrors);
  } else {
    console.log(`   ✅ ZERO Browser Console Errors Detected!`);
  }

  await browser.close();
  console.log(`🎉 ALL BROWSER E2E TESTS PASSED ON PRODUCTION (https://chord.worldinspirelab.com/)!`);
})();
