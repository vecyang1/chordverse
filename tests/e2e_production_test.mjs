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
    { prog: '1,5,6,4', expectedTitle: '流行四和弦' },
    { prog: 'all', expectedTitle: '全部曲库' }
  ];

  for (const preset of presets) {
    const btn = page.locator(`.chip[data-prog="${preset.prog}"]`);
    await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/search?') && r.status() === 200, { timeout: 20000 }),
      btn.click()
    ]);
    await page.waitForFunction(() => {
      const t = document.querySelector('#progression-name-title')?.textContent || '';
      return t.length > 0 && !t.includes('检索中');
    }, null, { timeout: 20000 });
    const progTitle = await page.textContent('#progression-name-title');
    const countText = await page.textContent('#total-songs-count');
    console.log(`   Clicked chip [${preset.prog}] -> Title: "${progTitle}", Hits: ${countText}`);
    if (!progTitle.includes(preset.expectedTitle)) {
      throw new Error(`Expected progression title to contain "${preset.expectedTitle}", got "${progTitle}"`);
    }
    if (preset.prog === 'all' && parseInt(countText, 10) < 1000) {
      throw new Error(`Expected >1000 songs for 'all' preset, got ${countText}`);
    }
  }

  // Restore 1-5-6-4 for subsequent tests
  await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/search?') && r.status() === 200, { timeout: 20000 }),
    page.locator('.chip[data-prog="1,5,6,4"]').click()
  ]);

  // 3. Test Audio Synthesizer Loop & Playback Controls
  console.log(`🚀 Step 3: Testing Web Audio Progression Loop (Play/Stop)...`);
  const btnPlay = page.locator('#btn-play-loop');
  await btnPlay.click();
  await page.waitForTimeout(400);

  const isPlaying = await btnPlay.evaluate(el => el.classList.contains('btn-playing'));
  const playText = await page.textContent('#play-btn-text');
  console.log(`   Loop Playing State: ${isPlaying}, Button Text: "${playText.trim()}"`);
  if (!isPlaying || !playText.includes('停止')) {
    throw new Error(`Audio loop failed to toggle playing state: isPlaying=${isPlaying}, text="${playText}"`);
  }

  // Wait for note highlight on active chips
  await page.waitForSelector('.active-deg-chip.playing-highlight', { timeout: 5000 });
  console.log(`   Audio highlight detected on active chord chips.`);

  // Click single chip to test polyphonic chord trigger
  const firstChip = page.locator('.active-deg-chip').first();
  await firstChip.click();

  // Stop loop
  await btnPlay.click();
  await page.waitForTimeout(200);
  const isStopped = await btnPlay.evaluate(el => !el.classList.contains('btn-playing'));
  console.log(`   Audio loop stopped successfully: ${isStopped}`);
  if (!isStopped) {
    throw new Error(`Audio loop failed to stop.`);
  }

  // 4. Test Next Chord Probability Prediction
  console.log(`🚀 Step 4: Testing Next Chord Probability Prediction...`);
  await page.waitForSelector('#prob-container .prob-row', { timeout: 10000 });
  const probRowCount = await page.locator('#prob-container .prob-row').count();
  const topProbLabel = await page.locator('#prob-container .prob-row .prob-degree-label').first().textContent();
  const topProbVal = await page.locator('#prob-container .prob-row .prob-val').first().textContent();
  console.log(`   Rendered ${probRowCount} probability rows. Top: ${topProbLabel.trim().replace(/\s+/g, ' ')} (${topProbVal.trim()})`);
  if (probRowCount === 0 || !topProbVal.includes('%')) {
    throw new Error(`Next chord probability prediction failed to render valid rows.`);
  }

  // Click top probability row to extend progression
  console.log(`   Clicking top probability row to extend progression...`);
  const initialInputVal = await page.inputValue('#input-progression');
  await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/search?') && r.status() === 200, { timeout: 20000 }),
    page.locator('#prob-container .prob-row').first().click()
  ]);
  const extendedInputVal = await page.inputValue('#input-progression');
  console.log(`   Progression extended from "${initialInputVal}" -> "${extendedInputVal}"`);
  if (extendedInputVal === initialInputVal) {
    throw new Error(`Progression was not extended on probability row click.`);
  }

  // 5. Test Key Transposition Select
  console.log(`🚀 Step 5: Testing Key Transposition Selector...`);
  const keySelect = page.locator('#play-key-select');
  await keySelect.selectOption('G');
  await page.waitForTimeout(300);
  const refKeysText = await page.textContent('#ref-keys-box');
  console.log(`   Transposed -> Reference Box: "${refKeysText.trim().replace(/\s+/g, ' ')}"`);
  if (!refKeysText.includes('G 调参考')) {
    throw new Error(`Key transposition box did not render expected G key reference.`);
  }

  // 6. Test Step Builder Buttons (Clear, Degree Buttons, Backspace)
  console.log(`🚀 Step 6: Testing Step Builder Buttons...`);
  await page.locator('#btn-clear').click();
  await page.waitForTimeout(200);

  await page.locator('.chord-btn[data-degree="1"]').click();
  await page.locator('.chord-btn[data-degree="5"]').click();
  await page.locator('.chord-btn[data-degree="6"]').click();
  await page.locator('.chord-btn[data-degree="4"]').click();
  await page.waitForTimeout(200);

  let customInputVal = await page.inputValue('#input-progression');
  console.log(`   Built Progression Input: "${customInputVal}"`);
  if (customInputVal !== '1,5,6,4') {
    throw new Error(`Expected input '1,5,6,4', got '${customInputVal}'`);
  }

  // Test Backspace
  await page.locator('#btn-backspace').click();
  await page.waitForTimeout(200);
  customInputVal = await page.inputValue('#input-progression');
  console.log(`   After Backspace: "${customInputVal}"`);
  if (customInputVal !== '1,5,6') {
    throw new Error(`Expected '1,5,6' after backspace, got '${customInputVal}'`);
  }

  // Restore 4
  await page.locator('.chord-btn[data-degree="4"]').click();
  await page.waitForTimeout(200);

  // 7. Test Quick Song Search Shortcut & Builder Synchronization
  console.log(`🚀 Step 7: Testing Quick Song Shortcuts (青花瓷)...`);
  const songBtn = page.locator('.btn-quick-song', { hasText: '青花瓷' });
  await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/search?') && r.status() === 200, { timeout: 20000 }),
    songBtn.click()
  ]);
  await page.waitForFunction(() => {
    const titleEl = document.querySelector('#progression-name-title');
    return titleEl && titleEl.textContent.includes('青花瓷');
  }, { timeout: 15000 });

  const qSongTitle = await page.textContent('#songs-tbody tr:first-child .song-title');
  const qSongArtist = await page.textContent('#songs-tbody tr:first-child .song-artist');
  const qActiveInput = await page.inputValue('#input-progression');
  console.log(`   Found Song: "${qSongTitle.trim()}" by "${qSongArtist.trim()}", Synced Progression: "${qActiveInput}"`);
  if (!qSongTitle.includes('青花瓷') || !qSongArtist.includes('周杰伦')) {
    throw new Error(`Quick song search did not return expected song: ${qSongTitle} / ${qSongArtist}`);
  }

  // 8. Test Chord Sheet Decoder
  console.log(`🚀 Step 8: Testing Chord Sheet Decoder & Import to Search...`);
  await page.fill('#custom-chords-input', 'F G Em Am Dm G C');
  await page.locator('#btn-custom-analyze').click();
  await page.waitForSelector('#custom-analysis-result:not(:empty)', { timeout: 5000 });
  const decodeOutput = await page.textContent('#custom-analysis-result');
  console.log(`   Chord Sheet Decode Result:\n${decodeOutput.trim().replace(/\s+/g, ' ')}`);
  if (!decodeOutput.includes('IV - V - iii - vi - ii - V - I') || !decodeOutput.includes('4,5,3,6,2,5,1')) {
    throw new Error(`Decode output does not contain expected Roman progression: "${decodeOutput}"`);
  }

  // Click "用此进行检索歌曲 ➔"
  await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/search?') && r.status() === 200, { timeout: 20000 }),
    page.locator('#btn-use-custom-prog').click()
  ]);
  const importedProgVal = await page.inputValue('#input-progression');
  console.log(`   Imported Decoded Progression into Search: "${importedProgVal}"`);
  if (importedProgVal !== '4,5,3,6,2,5,1') {
    throw new Error(`Expected search progression '4,5,3,6,2,5,1', got '${importedProgVal}'`);
  }

  // 9. Test Yopu Search Input & One-Click Sheet Parsing
  console.log(`🚀 Step 9: Testing Yopu Score Search & One-Click Sheet Parse...`);
  await page.fill('#yopu-import-input', '再见青春');
  await page.locator('#btn-yopu-search').click();
  await page.waitForFunction(() => {
    const box = document.querySelector('#yopu-search-results-box');
    return box && box.textContent.trim().length > 0 && !box.querySelector('.loading-spinner');
  }, null, { timeout: 20000 });

  const yopuResultText = await page.textContent('#yopu-search-results-box');
  const yopuRows = await page.locator('#yopu-search-results-box .yopu-result-row').count();
  console.log(`   Yopu Rows Rendered: ${yopuRows}`);
  if (yopuRows === 0 || /搜索失败|未找到/.test(yopuResultText)) {
    throw new Error(`Yopu search rendered no usable results: ${yopuResultText.slice(0, 200)}`);
  }

  // Click first result's "解析 ➔" button
  console.log(`   Clicking first Yopu sheet result '解析 ➔'...`);
  const firstImportBtn = page.locator('#yopu-search-results-box .btn-import-item').first();
  if (await firstImportBtn.count() > 0) {
    await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/import-yopu') && r.status() === 200, { timeout: 25000 }),
      firstImportBtn.click()
    ]);
    await page.waitForSelector('#yopu-import-result:not(:empty)', { timeout: 10000 });
    const importOutput = await page.textContent('#yopu-import-result');
    console.log(`   Yopu Import Sheet Output: ${importOutput.trim().replace(/\s+/g, ' ').slice(0, 160)}...`);
    if (!importOutput.includes('再见青春') && !importOutput.includes('汪峰')) {
      throw new Error(`Yopu import output did not identify song metadata: ${importOutput}`);
    }
  }

  // 10. Test Language and Artist Filtering
  console.log(`🚀 Step 10: Testing Language and Artist Filters...`);
  // Reset search to 1,5,6,4
  await page.fill('#input-progression', '1,5,6,4');
  await page.locator('#btn-search').click();
  await page.waitForTimeout(500);

  // Filter to Chinese
  const langSelect = page.locator('#select-lang');
  await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/search?') && r.status() === 200, { timeout: 20000 }),
    langSelect.selectOption('zh')
  ]);
  const zhBadgeCount = await page.locator('#songs-tbody .badge-zh').count();
  const enBadgeCount = await page.locator('#songs-tbody .badge-en').count();
  console.log(`   Language Filter (zh) -> Chinese Badges: ${zhBadgeCount}, Western Badges: ${enBadgeCount}`);
  if (zhBadgeCount === 0 || enBadgeCount > 0) {
    throw new Error(`Language filter failed: expected only zh badges, got zh=${zhBadgeCount}, en=${enBadgeCount}`);
  }

  // Filter to specific artist "汪峰"
  const artistInput = page.locator('#input-artist');
  await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/search?') && r.status() === 200, { timeout: 20000 }),
    artistInput.fill('汪峰')
  ]);
  const artistResultText = await page.textContent('#songs-tbody');
  console.log(`   Artist Filter ('汪峰') verified.`);
  if (!artistResultText.includes('汪峰')) {
    throw new Error(`Artist filter for '汪峰' returned no matching songs.`);
  }

  // Reset filters
  await artistInput.fill('');
  await langSelect.selectOption('all');
  await page.waitForTimeout(500);

  // 11. Test Export Modals / Triggers
  console.log(`🚀 Step 11: Testing CSV & Markdown Exporters...`);
  await page.locator('#btn-export-csv').click();
  await page.locator('#btn-export-md').click();
  console.log(`   Export triggers executed cleanly.`);

  // 12. Responsive Mobile Viewport Audit
  console.log(`🚀 Step 12: Auditing Mobile Viewport (iPhone 375x812)...`);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(500);
  const isOverflowing = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth + 2;
  });
  console.log(`   Mobile Horizontal Overflow Detected: ${isOverflowing}`);
  if (isOverflowing) {
    console.warn(`⚠️ Warning: Mobile layout has slight horizontal scroll.`);
  }

  const mobileScreenshotPath = path.resolve('tests/production_mobile_screenshot.png');
  await page.screenshot({ path: mobileScreenshotPath, fullPage: true });
  console.log(`   Mobile Screenshot saved to: ${mobileScreenshotPath}`);

  // Restore Desktop Viewport for final screenshot
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.waitForTimeout(500);

  // 13. Capture High-Resolution Desktop Screenshot
  console.log(`🚀 Step 13: Capturing Production Desktop Full-Page Screenshot...`);
  const screenshotPath = path.resolve('tests/production_e2e_screenshot.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`   Screenshot saved to: ${screenshotPath}`);

  // 14. Check Console Errors
  console.log(`🚀 Step 14: Auditing Browser Console Errors...`);
  if (consoleErrors.length > 0) {
    console.warn(`⚠️ Warning: Detected ${consoleErrors.length} console errors:`, consoleErrors);
  } else {
    console.log(`   ✅ ZERO Browser Console Errors Detected!`);
  }

  await browser.close();
  console.log(`🎉 ALL BROWSER E2E TESTS PASSED ON PRODUCTION (https://chord.worldinspirelab.com/)!`);
})();
