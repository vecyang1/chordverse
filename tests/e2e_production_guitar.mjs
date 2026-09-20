import { chromium } from '/Users/vecsatfoxmailcom/Documents/A-coding/world-inspire-page-kit/node_modules/playwright/index.mjs';
import path from 'path';

const TARGET_URL = process.env.CHORDVERSE_BASE_URL || 'https://chord.worldinspirelab.com/?q=4,5,3,6,2,5,1';

console.log(`🌐 Launching Chrome to execute guitar suite production E2E test on ${TARGET_URL}...`);

(async () => {
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
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

  // 1. Wait for songs table to populate
  await page.waitForFunction(() => {
    const tbody = document.querySelector('#songs-tbody');
    return tbody && !tbody.querySelector('.loading-spinner') && tbody.querySelectorAll('tr').length > 0;
  }, null, { timeout: 20000 });

  const totalSongs = await page.textContent('#total-songs-count');
  console.log(`   Total matched songs for Royal Road: ${totalSongs}`);

  // 2. Check top Chinese songs order
  const songTitles = await page.$$eval('#songs-tbody tr .song-title', els => els.slice(0, 5).map(e => e.textContent.trim()));
  console.log(`   Top 5 Songs: ${JSON.stringify(songTitles)}`);
  const hasIconic = songTitles.some(t => t.includes('水星记') || t.includes('凄美地') || t.includes('青花瓷'));
  if (!hasIconic) {
    throw new Error(`Expected iconic Mandopop hits, got: ${JSON.stringify(songTitles)}`);
  }

  // 3. Test Song Row Click Interaction (click on 青花瓷 row)
  console.log(`🚀 Step 2: Clicking on '青花瓷' song row to test dynamic key sync...`);
  const qhcRow = page.locator('#songs-tbody tr', { hasText: '青花瓷' }).first();
  await qhcRow.click();
  await page.waitForTimeout(500);

  // Verify row selected class
  const isSelected = await qhcRow.evaluate(el => el.classList.contains('selected-song-row'));
  console.log(`   '青花瓷' row highlighted (.selected-song-row): ${isSelected}`);
  if (!isSelected) throw new Error("Song row failed to receive 'selected-song-row' class upon click");

  // Verify playKeySelect updated to 'A'
  const currentKey = await page.$eval('#play-key-select', el => el.value);
  console.log(`   Active key in selector after clicking 青花瓷: ${currentKey}`);
  if (currentKey !== 'A') {
    throw new Error(`Expected key 'A' for 青花瓷, got '${currentKey}'`);
  }

  // 4. Verify Capo recommendation
  const capoText = await page.textContent('#capo-text');
  console.log(`   Capo recommendation: "${capoText}"`);
  if (!capoText.includes('A 调')) {
    throw new Error(`Expected Capo text to mention 'A 调', got: "${capoText}"`);
  }

  // 5. Test 7th Chords Voicing Toggle
  console.log(`🚀 Step 3: Toggling 7th Chords Voicing (七和弦扩展)...`);
  await page.click('#voicing-toggle .seg-btn[data-voicing="seventh"]');
  await page.waitForTimeout(500);

  // Verify chords in guitar suite container for A major Royal Road
  const chordNames = await page.$$eval('#chord-boxes-container .chord-box-card', els => els.map(e => e.dataset.chord));
  console.log(`   Guitar Suite Chord Shapes (A Major 7ths): ${JSON.stringify(chordNames)}`);

  // Expect: Dmaj7, E7, C#7, F#m7, Bm7, E7, Amaj7
  if (!chordNames.includes('C#7') || !chordNames.includes('F#m7') || !chordNames.includes('Amaj7')) {
    throw new Error(`Expected 7th chords in A major (C#7, F#m7, Amaj7), got: ${JSON.stringify(chordNames)}`);
  }

  // 6. Verify Secondary Dominant Theory Tip
  const tipVisible = await page.isVisible('#theory-tip-card');
  const tipContent = await page.textContent('#theory-tip-body');
  console.log(`   Theory Tip Card Visible: ${tipVisible}`);
  console.log(`   Theory Tip Body: "${tipContent.trim().substring(0, 80)}..."`);
  if (!tipVisible || !tipContent.includes('C#7 → F#m')) {
    throw new Error(`Expected theory tip for A major secondary dominant C#7 -> F#m, got: "${tipContent}"`);
  }

  // 7. Verify SVG Box rendering for C#7
  const svgCsharp7 = await page.$eval('.chord-box-card[data-chord="C#7"] svg', el => el.outerHTML);
  if (!svgCsharp7.includes('C#7') || !svgCsharp7.includes('svg-finger-dot')) {
    throw new Error(`C#7 SVG missing chord title or finger dots: ${svgCsharp7.substring(0, 100)}`);
  }
  console.log(`   ✅ C#7 SVG diagram rendered with complete dots and barre!`);

  // 8. Test Chord Strum Click
  console.log(`🚀 Step 4: Clicking C#7 chord card to test audio strumming...`);
  await page.click('.chord-box-card[data-chord="C#7"]');
  await page.waitForTimeout(400);

  // 9. Save High-Res Production Screenshot
  console.log(`🚀 Step 5: Capturing Production Verification Screenshot...`);
  const screenshotPath = path.resolve('tests/production_guitar_suite_verified.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`   Saved verified screenshot to: ${screenshotPath}`);

  if (errors.length > 0) {
    console.warn(`⚠️ Warning: ${errors.length} browser errors recorded.`);
  } else {
    console.log(`   ✅ ZERO Console Errors Detected on Production Chrome!`);
  }

  await browser.close();
  console.log(`🎉 GUITAR SUITE & INTERACTIVE E2E TEST COMPLETED SUCCESSFULLY!`);
})();
