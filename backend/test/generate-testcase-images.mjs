import puppeteer from 'puppeteer';
import path from 'node:path';
import fs from 'node:fs';

const outputDir = 'C:\\Users\\sahil rathod\\.gemini\\antigravity\\brain\\86bdf14f-9258-4aa0-9dd3-bdefd079d9bd';

const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>InsightLens Test Cases</title>
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      background-color: #2b2b2b;
      font-family: 'Times New Roman', Times, serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 40px;
      padding: 40px 0;
    }
    .page-container {
      width: 794px;
      height: 1123px; /* Standard A4 at 96 DPI */
      background: #ffffff;
      padding: 30px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      display: flex;
      flex-direction: column;
      position: relative;
    }
    .page-border {
      border: 2px solid #000000;
      height: 100%;
      padding: 24px;
      display: flex;
      flex-direction: column;
    }
    .page-header {
      text-align: center;
      margin-bottom: 24px;
    }
    .page-title {
      font-size: 34px;
      font-weight: bold;
      text-decoration: underline;
      letter-spacing: 0.5px;
      font-family: 'Times New Roman', Times, serif;
    }
    .page-subtitle {
      font-size: 13px;
      color: #333;
      margin-top: 4px;
      font-style: italic;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #000000;
      font-family: 'Times New Roman', Times, serif;
    }
    th, td {
      border: 1.5px solid #000000;
      padding: 8px 7px;
      font-size: 12.5px;
      line-height: 1.35;
      color: #000000;
      vertical-align: top;
    }
    th {
      font-weight: bold;
      text-align: left;
      background-color: #ffffff;
      font-size: 13px;
    }
    th.center, td.center {
      text-align: center;
    }
    .col-sr { width: 6%; }
    .col-desc { width: 17%; }
    .col-steps { width: 23%; }
    .col-data { width: 23%; }
    .col-result { width: 22%; }
    .col-status { width: 9%; }

    .page-footer {
      margin-top: auto;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #555;
      padding-top: 10px;
    }
  </style>
</head>
<body>

  <!-- PAGE 1 -->
  <div class="page-container" id="page1">
    <div class="page-border">
      <div class="page-header">
        <h1 class="page-title">Test Cases</h1>
        <div class="page-subtitle">Project: InsightLens • Module: Authentication, Onboarding & Visual Ingestion (Page 1/2)</div>
      </div>

      <table>
        <thead>
          <tr>
            <th class="col-sr center">Sr.no</th>
            <th class="col-desc">Test Case Description</th>
            <th class="col-steps">Test Steps</th>
            <th class="col-data">Test Data</th>
            <th class="col-result">Expected Result</th>
            <th class="col-status center">Pass/Fail</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="center">01</td>
            <td>Check User Registration with Valid Data</td>
            <td>1. Go to Signup page<br>2. Enter First Name, Last Name, Username, Email, Password<br>3. Click Sign Up</td>
            <td>Name=Alex Rivera<br>Username=alex_rivera<br>Email=alex@insightlens.edu<br>Password=Test@123</td>
            <td>Successfully Registered; user session created and redirected to Onboarding flow.</td>
            <td class="center">Pass</td>
          </tr>
          <tr>
            <td class="center">02</td>
            <td>Check User Registration with Invalid Email</td>
            <td>1. Go to Signup page<br>2. Enter Name, Email without '@', Password<br>3. Click Sign Up</td>
            <td>Name=Alex Rivera<br>Email=alex_insightlens.edu<br>Password=Test@123</td>
            <td>Error: Please include an '@' in the email address. Registration blocked.</td>
            <td class="center">Pass</td>
          </tr>
          <tr>
            <td class="center">03</td>
            <td>Check Login with Valid Credentials</td>
            <td>1. Go to Login page<br>2. Enter registered Email & Password<br>3. Click Sign In</td>
            <td>Email=alex@insightlens.edu<br>Password=Test@123</td>
            <td>Successfully Logged In; JWT session issued; redirected to Home landing page.</td>
            <td class="center">Pass</td>
          </tr>
          <tr>
            <td class="center">04</td>
            <td>Check Login with Invalid Password</td>
            <td>1. Go to Login page<br>2. Enter valid Email & incorrect Password<br>3. Click Sign In</td>
            <td>Email=alex@insightlens.edu<br>Password=wrongpass</td>
            <td>Error: Invalid email or password. Access denied.</td>
            <td class="center">Pass</td>
          </tr>
          <tr>
            <td class="center">05</td>
            <td>Check Avatar Upload & Boundary Containment</td>
            <td>1. In Signup or Profile, click upload avatar<br>2. Select high-res photo<br>3. Inspect preview container</td>
            <td>Image=avatar_2400px.jpg</td>
            <td>Image strictly contained inside circular avatar box; does not break page layout.</td>
            <td class="center">Pass</td>
          </tr>
          <tr>
            <td class="center">06</td>
            <td>Check 7-Step Researcher Onboarding</td>
            <td>1. Complete registration<br>2. Select Role, Field, Visual Types, Depth<br>3. Click Complete Setup</td>
            <td>Role=Researcher<br>Field=Computer Science<br>Depth=Balanced</td>
            <td>Preferences persisted into PostgreSQL user_profiles; redirected to Home view.</td>
            <td class="center">Pass</td>
          </tr>
          <tr>
            <td class="center">07</td>
            <td>Check Visual Artifact Upload with Valid Image</td>
            <td>1. Go to Research Desk<br>2. Drag & drop or browse valid image (JPEG/PNG)<br>3. Observe preview</td>
            <td>File=architecture_diagram.png<br>Size=450 KB</td>
            <td>Image accepted; dimensions and optical preview rendered on canvas.</td>
            <td class="center">Pass</td>
          </tr>
          <tr>
            <td class="center">08</td>
            <td>Check Upload with Unsupported Format</td>
            <td>1. Go to Research Desk<br>2. Attempt to upload non-raster file (.SVG or .PDF)</td>
            <td>File=vector_graphic.svg</td>
            <td>Error: Unsupported file format. Only JPEG, PNG, and WebP are allowed. Upload rejected.</td>
            <td class="center">Pass</td>
          </tr>
        </tbody>
      </table>

      <div class="page-footer">
        <span>InsightLens — System Documentation</span>
        <span>Page 1 of 2</span>
      </div>
    </div>
  </div>

  <!-- PAGE 2 -->
  <div class="page-container" id="page2">
    <div class="page-border">
      <div class="page-header">
        <h1 class="page-title">Test Cases</h1>
        <div class="page-subtitle">Project: InsightLens • Module: Visual Intelligence, Live Vision, Diff & Security (Page 2/2)</div>
      </div>

      <table>
        <thead>
          <tr>
            <th class="col-sr center">Sr.no</th>
            <th class="col-desc">Test Case Description</th>
            <th class="col-steps">Test Steps</th>
            <th class="col-data">Test Data</th>
            <th class="col-result">Expected Result</th>
            <th class="col-status center">Pass/Fail</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="center">09</td>
            <td>Check Multimodal AI Research Brief Generation</td>
            <td>1. Upload valid diagram/photo<br>2. Click "Begin Visual Analysis"<br>3. Wait for pipeline completion</td>
            <td>Image=system_dfd.png<br>Style=Classic Academic</td>
            <td>Research brief generated; returns Executive Summary, Findings, and verified citations.</td>
            <td class="center">Pass</td>
          </tr>
          <tr>
            <td class="center">10</td>
            <td>Check Diagram Structural Extraction</td>
            <td>1. Upload Data Flow Diagram (DFD) or Flowchart<br>2. Run analysis<br>3. Inspect Diagram section</td>
            <td>Diagram=order_flowchart.png</td>
            <td>Structured processes, decision nodes, and directed data flows extracted into table.</td>
            <td class="center">Pass</td>
          </tr>
          <tr>
            <td class="center">11</td>
            <td>Check Evidentiary Epistemic Classification</td>
            <td>1. Inspect "Evidence & Interpretation" section in report</td>
            <td>Report findings & claims</td>
            <td>Directly visible elements marked as OBSERVED; external facts marked as INFERRED.</td>
            <td class="center">Pass</td>
          </tr>
          <tr>
            <td class="center">12</td>
            <td>Check Live Vision Real-Time Object Detection</td>
            <td>1. Go to Live Vision<br>2. Click "Start Live Camera"<br>3. Point camera at physical objects</td>
            <td>Objects in view: Laptop, Phone, Chair</td>
            <td>Real-time bounding boxes and labels drawn over detected objects via COCO-SSD model.</td>
            <td class="center">Pass</td>
          </tr>
          <tr>
            <td class="center">13</td>
            <td>Check Visual Comparison (Diff Engine)</td>
            <td>1. Go to Compare<br>2. Select Diagram V1 and Diagram V2<br>3. Click "Run Visual Diff"</td>
            <td>Diagram A=Architecture v1<br>Diagram B=Architecture v2</td>
            <td>Accurately identifies and lists ADDED, REMOVED, and UNCHANGED components.</td>
            <td class="center">Pass</td>
          </tr>
          <tr>
            <td class="center">14</td>
            <td>Check Report Search & Filter in Archive</td>
            <td>1. Go to Archive page<br>2. Type keyword in search box<br>3. Select category filter</td>
            <td>Query=Architecture<br>Category=Diagram</td>
            <td>Archive dynamically filters and displays only matching report cards with thumbnails.</td>
            <td class="center">Pass</td>
          </tr>
          <tr>
            <td class="center">15</td>
            <td>Check Academic PDF Export</td>
            <td>1. Open completed report<br>2. Click "Export PDF" button</td>
            <td>Active report brief</td>
            <td>Print stylesheet triggers; hides UI buttons and downloads clean formatted academic report PDF.</td>
            <td class="center">Pass</td>
          </tr>
          <tr>
            <td class="center">16</td>
            <td>Check Brute-Force Rate Limiting Security</td>
            <td>1. Send > 100 consecutive requests to login endpoint within 15 mins</td>
            <td>101 requests from same IP</td>
            <td>HTTP 429 Too Many Requests: Rate limit exceeded. Please try again after 15 minutes.</td>
            <td class="center">Pass</td>
          </tr>
        </tbody>
      </table>

      <div class="page-footer">
        <span>InsightLens — System Documentation</span>
        <span>Page 2 of 2</span>
      </div>
    </div>
  </div>

</body>
</html>
`;

async function renderScreenshots() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 2600, deviceScaleFactor: 2 });
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  // 1. Capture Page 1
  const page1El = await page.$('#page1');
  if (page1El) {
    const page1Path = path.join(outputDir, 'insightlens_test_cases_page1.png');
    await page1El.screenshot({ path: page1Path });
    console.log('Saved Page 1 screenshot to:', page1Path);
  }

  // 2. Capture Page 2
  const page2El = await page.$('#page2');
  if (page2El) {
    const page2Path = path.join(outputDir, 'insightlens_test_cases_page2.png');
    await page2El.screenshot({ path: page2Path });
    console.log('Saved Page 2 screenshot to:', page2Path);
  }

  // 3. Capture Combined Document
  const fullDocPath = path.join(outputDir, 'insightlens_test_cases_full_document.png');
  await page.screenshot({ path: fullDocPath, fullPage: true });
  console.log('Saved Full Document screenshot to:', fullDocPath);

  await browser.close();
}

renderScreenshots().catch(err => {
  console.error('Error generating screenshots:', err);
  process.exit(1);
});
