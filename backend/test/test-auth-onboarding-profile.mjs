import { buildAiPrompt } from '../src/utils/aiPrompts.js';

const BACKEND_URL = process.env.VITE_BACKEND_URL || 'https://insightlens-backend.onrender.com';

async function runAuthOnboardingProfileTest() {
  console.log('==================================================');
  console.log('STARTING AUTH, ONBOARDING & PROFILE INTEGRATION TESTS');
  console.log(`Target Backend: ${BACKEND_URL}`);
  console.log('==================================================\n');

  // 1. AI Prompt Construction Verification with Researcher Personalization
  console.log('1. Testing AI Prompt Directive Injection from User Preferences...');
  const prompt = buildAiPrompt('en', 'long', 'Quantum Computing Topology', 'classic', 'APA', {
    role: 'Principal Research Scientist',
    field: 'Advanced Neural Perception',
    primary_uses: ['Academic & Scholarly Research', 'Software & System Flow Analysis'],
    interests: ['Artificial Intelligence & ML', 'Computer Science & Systems'],
    analysis_depth: 'research',
    presentation_style: ['evidence-first', 'balanced'],
    evidence_preference: 'research-grade'
  });

  if (!prompt.includes('Principal Research Scientist') || !prompt.includes('RESEARCHER PERSONALIZATION') || !prompt.includes('research-grade')) {
    throw new Error('AI prompt generator did not inject personalization block!');
  }
  console.log('   ✔ AI Prompt correctly contains researcher personalization directives and evidence rigor');

  // 2. Health Check
  console.log('\n2. Testing Backend Health...');
  try {
    const healthRes = await fetch(`${BACKEND_URL}/health`);
    const healthJson = await healthRes.json();
    console.log(`   ✔ Backend Health: ${healthJson.status || 'OK'}`);
  } catch (err) {
    console.log(`   ℹ Backend health check note: ${err.message}`);
  }

  // 3. User Registration with Avatar & Full Name & Username
  console.log('\n3. Testing User Registration with Avatar Photo & Username...');
  const testEmail = `scholar_${Date.now()}@insightlens-lab.org`;
  const testUsername = `lead_researcher_${Date.now()}`;
  const testPassword = 'StrongPassword123!';
  const testAvatar = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const regRes = await fetch(`${BACKEND_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: 'Sahil',
      lastName: 'Rathod',
      username: testUsername,
      email: testEmail,
      password: testPassword,
      avatar: testAvatar
    })
  });

  const regJson = await regRes.json();
  if (!regRes.ok || !regJson.success) {
    throw new Error(`Registration failed: ${JSON.stringify(regJson)}`);
  }
  const token = regJson.data.token;
  const user = regJson.data.user;
  console.log(`   ✔ Registered: ${user.name} (@${user.username}) | Avatar: ${user.avatar ? 'Present' : 'None'}`);

  // 4. Login by Username
  console.log('\n4. Testing Login with Username Identifier...');
  const loginRes = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: testUsername,
      password: testPassword
    })
  });

  const loginJson = await loginRes.json();
  if (!loginRes.ok || !loginJson.success) {
    throw new Error(`Login by username failed: ${JSON.stringify(loginJson)}`);
  }
  console.log(`   ✔ Login succeeded for: ${loginJson.data.user.firstName} (Onboarding completed: ${loginJson.data.user.onboarding_completed})`);

  // 5. Multi-Step Onboarding Data Persistence in PostgreSQL
  console.log('\n5. Testing Multi-Step Onboarding Persistence...');
  const onboardRes = await fetch(`${BACKEND_URL}/api/auth/onboarding`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      primaryUses: ['Academic & Scholarly Research', 'Software & System Flow Analysis'],
      interests: ['Artificial Intelligence & ML', 'Computer Science & Systems'],
      visualTypes: ['Photographs & Subject Staging', 'System Flowcharts & DFDs'],
      analysisDepth: 'research',
      presentationStyle: ['evidence-first', 'balanced'],
      evidencePreference: 'research-grade',
      role: 'Principal Research Scientist',
      field: 'Multimodal AI & Computer Vision',
      institution: 'Global Vision Institute',
      bio: 'Pioneering multimodal semantic extraction and graph verification algorithms.'
    })
  });

  const onboardJson = await onboardRes.json();
  if (!onboardRes.ok || !onboardJson.success) {
    throw new Error(`Save onboarding failed: ${JSON.stringify(onboardJson)}`);
  }
  console.log('   ✔ Onboarding saved to user_profiles table in PostgreSQL');

  // 6. User Profile Retrieval
  console.log('\n6. Testing User Profile Retrieval with Personalization...');
  const meRes = await fetch(`${BACKEND_URL}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const meJson = await meRes.json();
  if (!meRes.ok || !meJson.data) {
    throw new Error(`Profile retrieval failed: ${JSON.stringify(meJson)}`);
  }
  const prof = meJson.data;
  console.log(`   ✔ Retrieved: ${prof.name} (@${prof.username}) | Role: ${prof.role} | Onboarding Completed: ${prof.onboarding_completed}`);

  // 7. Live Activity Stats Calculation
  console.log('\n7. Testing Live PostgreSQL Activity Stats...');
  const statsRes = await fetch(`${BACKEND_URL}/api/auth/stats`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const statsJson = await statsRes.json();
  if (!statsRes.ok || !statsJson.data) {
    throw new Error(`Stats query failed: ${JSON.stringify(statsJson)}`);
  }
  console.log(`   ✔ Stats: Total Reports=${statsJson.data.totalReports}, Total Analyses=${statsJson.data.totalAnalyses}, Member Since=${statsJson.data.memberSince}`);

  // 8. Profile Updates (Photo, Bio, Role)
  console.log('\n8. Testing Profile Updates...');
  const updateRes = await fetch(`${BACKEND_URL}/api/auth/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      field: 'Cognitive Multimodal Systems',
      bio: 'Pioneering empirical validation for visual neural perception.'
    })
  });

  const updateJson = await updateRes.json();
  if (!updateRes.ok || !updateJson.success) {
    throw new Error(`Profile update failed: ${JSON.stringify(updateJson)}`);
  }
  console.log(`   ✔ Profile updated with new field: "${updateJson.data.field}"`);

  // 9. Change Password
  console.log('\n9. Testing Password Change...');
  const newPassword = 'BrandNewSecurePassword789!';
  const pwdRes = await fetch(`${BACKEND_URL}/api/auth/password`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      currentPassword: testPassword,
      newPassword: newPassword
    })
  });

  const pwdJson = await pwdRes.json();
  if (!pwdRes.ok || !pwdJson.success) {
    throw new Error(`Password change failed: ${JSON.stringify(pwdJson)}`);
  }
  console.log('   ✔ Password updated securely');

  console.log('\n==================================================');
  console.log('ALL AUTH, ONBOARDING & PROFILE TESTS PASSED (100%)');
  console.log('==================================================\n');
}

runAuthOnboardingProfileTest().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
