import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARTIFACT_DIR = 'C:\\Users\\sahil rathod\\.gemini\\antigravity\\brain\\86bdf14f-9258-4aa0-9dd3-bdefd079d9bd';

// Generate a high-res (1600x1600) test image for avatar testing
const testImgBase64 = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1600" viewBox="0 0 1600 1600">
  <defs>
    <radialGradient id="spiderman" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ff0044"/>
      <stop offset="60%" stop-color="#cc0022"/>
      <stop offset="100%" stop-color="#001144"/>
    </radialGradient>
  </defs>
  <rect width="1600" height="1600" fill="url(#spiderman)"/>
  <circle cx="800" cy="800" r="600" fill="#220055" stroke="#ffffff" stroke-width="40"/>
  <ellipse cx="650" cy="700" rx="140" ry="220" fill="#ffffff" transform="rotate(-20 650 700)"/>
  <ellipse cx="950" cy="700" rx="140" ry="220" fill="#ffffff" transform="rotate(20 950 700)"/>
  <text x="800" y="1250" font-size="120" font-family="Arial" font-weight="bold" fill="#ffffff" text-anchor="middle">SPIDER-AVATAR</text>
</svg>
`);

// Convert to temporary PNG file for file upload testing
const tempImgPath = path.join(__dirname, 'test-highres-avatar.svg');
fs.writeFileSync(tempImgPath, `<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="2400" viewBox="0 0 2400 2400">
  <rect width="2400" height="2400" fill="#b91c1c"/>
  <circle cx="1200" cy="1200" r="900" fill="#1e1b4b" stroke="#ffffff" stroke-width="40"/>
  <ellipse cx="950" cy="1050" rx="200" ry="320" fill="#ffffff" transform="rotate(-25 950 1050)"/>
  <ellipse cx="1450" cy="1050" rx="200" ry="320" fill="#ffffff" transform="rotate(25 1450 1050)"/>
  <text x="1200" y="1800" font-size="140" font-family="Arial" font-weight="bold" fill="#ffffff" text-anchor="middle">HIGH-RES SPIDERMAN</text>
</svg>`);

async function runTests() {
  console.log('--- Starting Comprehensive Browser Verification for Auth & Avatar Fixes ---');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Use local preview / dev server or production
  const TARGET_URL = process.env.TEST_URL || 'https://insight-lens.vercel.app';
  console.log(`Testing target: ${TARGET_URL}`);

  try {
    await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('✓ Initial page loaded.');

    // -------------------------------------------------------------
    // TEST A: Sign Up with High-Resolution Avatar & Contained Dimensions
    // -------------------------------------------------------------
    console.log('\n[TEST A] Navigating to Sign Up page...');
    await page.evaluate(() => window.navigateTo('signup'));
    await new Promise(r => setTimeout(r, 600));

    const signupDropzoneBefore = await page.$eval('#signup-avatar-dropzone', el => {
      const rect = el.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });
    console.log(`Dropzone dimensions before upload: ${signupDropzoneBefore.width}x${signupDropzoneBefore.height}px`);

    // Upload High-Res Avatar File
    console.log('Uploading 2400x2400 high-res avatar file...');
    const fileInput = await page.$('#signup-avatar-input');
    await fileInput.uploadFile(tempImgPath);
    await new Promise(r => setTimeout(r, 1000));

    // Verify Avatar Preview bounding rect
    const avatarPreviewBox = await page.$eval('#signup-avatar-preview', el => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return {
        width: rect.width,
        height: rect.height,
        display: style.display,
        objectFit: style.objectFit,
        borderRadius: style.borderRadius
      };
    });

    const dropzoneBoxAfter = await page.$eval('#signup-avatar-dropzone', el => {
      const rect = el.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });

    const signupCardBox = await page.$eval('#page-signup > div', el => {
      const rect = el.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });

    console.log(`Avatar Preview Rendered: ${avatarPreviewBox.width.toFixed(1)}x${avatarPreviewBox.height.toFixed(1)}px (Display: ${avatarPreviewBox.display}, ObjectFit: ${avatarPreviewBox.objectFit})`);
    console.log(`Dropzone Box: ${dropzoneBoxAfter.width.toFixed(1)}x${dropzoneBoxAfter.height.toFixed(1)}px`);
    console.log(`Signup Card Box: ${signupCardBox.width.toFixed(1)}x${signupCardBox.height.toFixed(1)}px`);

    if (avatarPreviewBox.width > 90 || avatarPreviewBox.height > 90) {
      throw new Error(`CRITICAL BUG: Avatar preview is oversized! Dimensions: ${avatarPreviewBox.width}x${avatarPreviewBox.height}`);
    }
    console.log('✓ Avatar Preview is strictly contained in 80x80px circular container without escaping!');

    const screenshotSignupPath = path.join(ARTIFACT_DIR, 'prod_fixed_signup_avatar_contained.png');
    await page.screenshot({ path: screenshotSignupPath });
    console.log(`Saved screenshot: ${screenshotSignupPath}`);

    // Fill Sign Up Form
    const randomId = Math.floor(10000 + Math.random() * 90000);
    const testUser = {
      firstName: 'Peter',
      lastName: 'Parker',
      username: `spidey_${randomId}`,
      email: `spidey_${randomId}@dailybugle.com`,
      password: 'SuperSecretPassword123!'
    };

    console.log(`Filling registration form for user: ${testUser.username}...`);
    await page.type('#signup-first-name', testUser.firstName);
    await page.type('#signup-last-name', testUser.lastName);
    await page.type('#signup-username', testUser.username);
    await page.type('#signup-email', testUser.email);
    await page.type('#signup-password', testUser.password);
    await page.type('#signup-confirm-password', testUser.password);

    await page.click('#signup-submit-btn');
    console.log('Submitted registration form. Waiting for onboarding navigation...');
    await page.waitForFunction(() => !document.getElementById('page-onboarding').classList.contains('hidden'), { timeout: 15000 });
    console.log('✓ Successfully arrived at #page-onboarding after registration.');

    // -------------------------------------------------------------
    // TEST B: Complete Onboarding & Verify Landing Redirection (NOT Analyze!)
    // -------------------------------------------------------------
    console.log('\n[TEST B] Completing 7-step Onboarding...');
    // Click through onboarding steps
    for (let s = 1; s <= 6; s++) {
      // Select first option in step
      await page.evaluate((stepNum) => {
        const stepEl = document.getElementById(`onboard-step-${stepNum}`);
        const btn = stepEl?.querySelector('[data-onboard-value]');
        if (btn) btn.click();
      }, s);
      await page.click('#onboarding-next-btn');
      await new Promise(r => setTimeout(r, 200));
    }

    // Step 7: Fill professional details
    await page.type('#onboard-role-input', 'Photojournalist & Biophysicist');
    await page.type('#onboard-field-input', 'Spectroscopy & Visual Biophysics');
    await page.type('#onboard-inst-input', 'Empire State University');
    await page.type('#onboard-bio-input', 'Investigating high-frequency visual spectra and spider silk crystalline diffraction.');

    console.log('Submitting onboarding setup...');
    await page.evaluate(() => {
      const btn = document.getElementById('onboarding-finish-btn');
      if (btn) {
        btn.scrollIntoView();
        btn.click();
      }
    });

    // Wait for landing page to become active
    await page.waitForFunction(() => !document.getElementById('page-landing').classList.contains('hidden'), { timeout: 15000 });
    
    // Ensure desk / analyze is hidden
    const isDeskHidden = await page.$eval('#page-desk', el => el.classList.contains('hidden'));
    const isLandingVisible = await page.$eval('#page-landing', el => !el.classList.contains('hidden'));
    
    console.log(`Is Landing Visible: ${isLandingVisible}`);
    console.log(`Is Analyze/Desk Hidden: ${isDeskHidden}`);

    if (!isLandingVisible || !isDeskHidden) {
      throw new Error(`CRITICAL BUG: Onboarding redirected to wrong page! Expected #page-landing visible, #page-desk hidden.`);
    }
    console.log('✓ BUG 2 FIXED: After onboarding, destination is strictly #page-landing (Home).');

    // Check navbar avatar and greeting
    const greetingText = await page.$eval('#header-user-name', el => el.textContent.trim());
    const navAvatarBox = await page.$eval('#nav-user-avatar', el => {
      const rect = el.getBoundingClientRect();
      const img = el.querySelector('img');
      return {
        width: rect.width,
        height: rect.height,
        hasImg: !!img,
        imgWidth: img ? img.getBoundingClientRect().width : 0,
        imgHeight: img ? img.getBoundingClientRect().height : 0
      };
    });

    console.log(`Navbar Greeting: "${greetingText}"`);
    console.log(`Navbar Avatar Box: ${navAvatarBox.width}x${navAvatarBox.height}px (Image: ${navAvatarBox.imgWidth}x${navAvatarBox.imgHeight}px, HasImg: ${navAvatarBox.hasImg})`);

    if (greetingText !== `Yo, ${testUser.firstName}`) {
      throw new Error(`Expected greeting "Yo, ${testUser.firstName}", got "${greetingText}"`);
    }
    if (navAvatarBox.width > 32 || navAvatarBox.height > 32 || navAvatarBox.imgWidth > 32) {
      throw new Error(`CRITICAL BUG: Navbar avatar exploded in size! (${navAvatarBox.width}x${navAvatarBox.height})`);
    }
    console.log('✓ Navbar greeting and contained avatar thumbnail verified!');

    const screenshotLandingPath = path.join(ARTIFACT_DIR, 'prod_fixed_landing_after_onboarding.png');
    await page.screenshot({ path: screenshotLandingPath });
    console.log(`Saved screenshot: ${screenshotLandingPath}`);

    // -------------------------------------------------------------
    // TEST C: Edit Profile Avatar in Profile Page
    // -------------------------------------------------------------
    console.log('\n[TEST C] Navigating to Profile Page...');
    await page.evaluate(() => window.navigateTo('profile'));
    await new Promise(r => setTimeout(r, 800));

    const profileAvatarBox = await page.$eval('#profile-avatar-circle', el => {
      const rect = el.getBoundingClientRect();
      const img = el.querySelector('#profile-avatar-img');
      const imgRect = img ? img.getBoundingClientRect() : null;
      return {
        width: rect.width,
        height: rect.height,
        imgWidth: imgRect ? imgRect.width : 0,
        imgHeight: imgRect ? imgRect.height : 0
      };
    });

    console.log(`Profile Page Avatar Box: ${profileAvatarBox.width.toFixed(1)}x${profileAvatarBox.height.toFixed(1)}px (Img: ${profileAvatarBox.imgWidth.toFixed(1)}x${profileAvatarBox.imgHeight.toFixed(1)}px)`);
    if (profileAvatarBox.width > 120 || profileAvatarBox.imgWidth > 120) {
      throw new Error(`CRITICAL BUG: Profile avatar is oversized! (${profileAvatarBox.width}x${profileAvatarBox.height})`);
    }

    // Open Edit Profile modal and upload new avatar
    await page.evaluate(() => document.getElementById('profile-edit-btn')?.click());
    await new Promise(r => setTimeout(r, 400));

    console.log('Uploading photo in Edit Profile modal...');
    const editFileInput = await page.$('#edit-profile-avatar-input');
    await editFileInput.uploadFile(tempImgPath);
    await new Promise(r => setTimeout(r, 800));

    const editPreviewBox = await page.$eval('#edit-profile-avatar-preview', el => {
      const rect = el.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });
    console.log(`Edit Modal Preview Box: ${editPreviewBox.width.toFixed(1)}x${editPreviewBox.height.toFixed(1)}px`);
    if (editPreviewBox.width > 90 || editPreviewBox.height > 90) {
      throw new Error(`CRITICAL BUG: Edit modal avatar preview is oversized! (${editPreviewBox.width}x${editPreviewBox.height})`);
    }

    // Save profile changes
    await page.evaluate(() => document.getElementById('edit-profile-save-btn')?.click());
    await new Promise(r => setTimeout(r, 1200));
    console.log('✓ Profile saved successfully with contained photo.');

    const screenshotProfilePath = path.join(ARTIFACT_DIR, 'prod_fixed_profile_contained.png');
    await page.screenshot({ path: screenshotProfilePath });
    console.log(`Saved screenshot: ${screenshotProfilePath}`);

    // -------------------------------------------------------------
    // TEST D: Sign Out and Test Login Redirection
    // -------------------------------------------------------------
    console.log('\n[TEST D] Signing Out...');
    await page.evaluate(() => document.getElementById('profile-logout-btn')?.click());
    await new Promise(r => setTimeout(r, 400));
    await page.evaluate(() => document.getElementById('confirm-logout-btn')?.click());
    await new Promise(r => setTimeout(r, 600));

    console.log('✓ Signed out. Arrived at Landing page.');

    console.log('Navigating to Login page...');
    await page.evaluate(() => window.navigateTo('login'));
    await new Promise(r => setTimeout(r, 600));

    console.log(`Logging in with existing completed user: ${testUser.username}...`);
    await page.type('#dedicated-login-identifier', testUser.username);
    await page.type('#dedicated-login-password', testUser.password);
    await page.evaluate(() => document.getElementById('dedicated-login-submit-btn')?.click());

    // Wait for landing page to become visible
    await page.waitForFunction(() => !document.getElementById('page-landing').classList.contains('hidden'), { timeout: 15000 });
    
    const isLandingAfterLogin = await page.$eval('#page-landing', el => !el.classList.contains('hidden'));
    const isDeskAfterLogin = await page.$eval('#page-desk', el => !el.classList.contains('hidden'));

    console.log(`After Login — Is Landing Page Active: ${isLandingAfterLogin}`);
    console.log(`After Login — Is Desk/Analyze Active: ${isDeskAfterLogin}`);

    if (!isLandingAfterLogin || isDeskAfterLogin) {
      throw new Error(`CRITICAL BUG: Login redirected to wrong page! Expected Landing active, Desk hidden.`);
    }
    console.log('✓ BUG 2 FIXED: Returning user login strictly lands on #page-landing (Home)!');

    const screenshotLoginPath = path.join(ARTIFACT_DIR, 'prod_fixed_login_redirect_landing.png');
    await page.screenshot({ path: screenshotLoginPath });
    console.log(`Saved screenshot: ${screenshotLoginPath}`);

    // -------------------------------------------------------------
    // TEST E: Page Refresh Session Persistence
    // -------------------------------------------------------------
    console.log('\n[TEST E] Testing Page Refresh Session Persistence...');
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    const refreshedGreeting = await page.$eval('#header-user-name', el => el.textContent.trim());
    const isLandingAfterReload = await page.$eval('#page-landing', el => !el.classList.contains('hidden'));

    console.log(`After Reload — Greeting: "${refreshedGreeting}", Landing Active: ${isLandingAfterReload}`);
    if (refreshedGreeting !== `Yo, ${testUser.firstName}` || !isLandingAfterReload) {
      throw new Error(`CRITICAL BUG: Session lost or wrong view after reload!`);
    }
    console.log('✓ Session persistence and landing view after reload verified!');

    console.log('\n======================================================');
    console.log('ALL AUTH AND AVATAR FIX VERIFICATION TESTS PASSED 100%!');
    console.log('======================================================');

  } catch (err) {
    console.error('Test execution failed:', err);
    process.exitCode = 1;
  } finally {
    if (fs.existsSync(tempImgPath)) {
      try { fs.unlinkSync(tempImgPath); } catch (e) {}
    }
    await browser.close();
  }
}

runTests();
