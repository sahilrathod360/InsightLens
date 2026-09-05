import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');

console.log('=== RENDER BACKEND DEPLOYMENT AUDIT ===\n');

// 1. Check all imports for existence and exact casing
console.log('1. Checking file imports and case sensitivity on disk...');
let brokenImports = 0;
let caseMismatches = 0;

function checkImports(dir) {
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (entry === 'node_modules' || entry === '.git') continue;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      checkImports(full);
    } else if (entry.endsWith('.js') || entry.endsWith('.mjs')) {
      const code = fs.readFileSync(full, 'utf8');
      const importRegex = /(?:import|from)\s+['"](\.[^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(code)) !== null) {
        const relPath = match[1];
        const targetPath = path.resolve(path.dirname(full), relPath);
        if (!fs.existsSync(targetPath)) {
          console.error(`  [BROKEN IMPORT] in ${path.relative(backendRoot, full)}: "${relPath}"`);
          brokenImports++;
        } else {
          const dirContents = fs.readdirSync(path.dirname(targetPath));
          const expectedBase = path.basename(targetPath);
          if (!dirContents.includes(expectedBase)) {
            const actualBase = dirContents.find(f => f.toLowerCase() === expectedBase.toLowerCase());
            console.error(`  [CASE MISMATCH] in ${path.relative(backendRoot, full)}: "${relPath}" -> actual on disk: "${actualBase}"`);
            caseMismatches++;
          }
        }
      }
    }
  }
}

checkImports(backendRoot);
console.log(`  Import scan finished: ${brokenImports} broken imports, ${caseMismatches} case mismatches.\n`);

// 2. Audit all external npm dependencies
console.log('2. Checking external package dependencies...');
const pkgPath = path.join(backendRoot, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const declaredDeps = new Set([
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
  'fs', 'path', 'url', 'crypto', 'http', 'https', 'stream', 'events', 'util', 'os', 'net', 'tls', 'zlib', 'dns', 'assert', 'child_process'
]);

const packageRegex = /(?:import|from)\s+['"]([a-zA-Z0-9@][^'"]*)['"]/g;
const usedPackages = new Set();

function checkPackageDeps(dir) {
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (entry === 'node_modules' || entry === '.git') continue;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      checkPackageDeps(full);
    } else if (entry.endsWith('.js')) {
      const code = fs.readFileSync(full, 'utf8');
      let match;
      while ((match = packageRegex.exec(code)) !== null) {
        const pkgName = match[1];
        if (!pkgName.startsWith('.')) {
          const rootPkg = pkgName.startsWith('@') ? pkgName.split('/').slice(0, 2).join('/') : pkgName.split('/')[0];
          usedPackages.add(rootPkg);
          if (!declaredDeps.has(rootPkg)) {
            console.error(`  [UNDECLARED DEPENDENCY] in ${path.relative(backendRoot, full)}: "${rootPkg}"`);
          }
        }
      }
    }
  }
}

checkPackageDeps(path.join(backendRoot, 'src'));
checkPackageDeps(backendRoot);
console.log(`  Package dependency audit finished. Used packages: ${Array.from(usedPackages).join(', ')}\n`);

// 3. Audit all environment variables referenced
console.log('3. Scanning all process.env usages...');
const envVars = new Map();
const envRegex = /process\.env\.([A-Z0-9_]+)/g;

function checkEnvVars(dir) {
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (entry === 'node_modules' || entry === '.git' || entry === 'test') continue;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      checkEnvVars(full);
    } else if (entry.endsWith('.js')) {
      const code = fs.readFileSync(full, 'utf8');
      let match;
      while ((match = envRegex.exec(code)) !== null) {
        const varName = match[1];
        if (!envVars.has(varName)) envVars.set(varName, new Set());
        envVars.get(varName).add(path.relative(backendRoot, full));
      }
    }
  }
}

checkEnvVars(backendRoot);

console.log('| Environment Variable | Used In Files |');
console.log('| :--- | :--- |');
for (const [v, files] of Array.from(envVars.entries()).sort()) {
  console.log(`| \`${v}\` | ${Array.from(files).join(', ')} |`);
}
console.log('\nAudit complete.');
