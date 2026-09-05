// InsightLens SSRF Protection & Safe URL Validation Layer
// Enforces strict protocol, port, hostname, IP address range, and DNS rebinding protections.

import net from 'net';
import dns from 'dns';
import http from 'http';
import https from 'https';
import { URL } from 'url';

/**
 * Parses an IPv4 string into 4 numeric octets [a, b, c, d].
 * Strictly rejects octal notation (leading zeros), hex notation, or non-decimal octets.
 */
export function parseIPv4(ip) {
  if (typeof ip !== 'string') return null;
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return null;

  const octets = [];
  for (const part of parts) {
    // Strictly numeric without leading zeros (except single '0')
    if (!/^(0|[1-9]\d*)$/.test(part)) return null;
    const num = Number(part);
    if (isNaN(num) || num < 0 || num > 255) return null;
    octets.push(num);
  }
  return octets;
}

/**
 * Checks if an IPv4 address is in a private, loopback, link-local, multicast, or reserved range.
 */
export function isPrivateOrReservedIPv4(ip) {
  const octets = parseIPv4(ip);
  if (!octets) return true; // Invalid IPv4 is unsafe

  const [a, b, c, d] = octets;

  // 0.0.0.0/8 - Current network ("this host")
  if (a === 0) return true;

  // 10.0.0.0/8 - Private network (RFC 1918)
  if (a === 10) return true;

  // 100.64.0.0/10 - Carrier-Grade NAT (RFC 6598)
  if (a === 100 && b >= 64 && b <= 127) return true;

  // 127.0.0.0/8 - Loopback (RFC 1122)
  if (a === 127) return true;

  // 169.254.0.0/16 - Link-Local / Cloud Metadata (RFC 3927) (includes 169.254.169.254)
  if (a === 169 && b === 254) return true;

  // 172.16.0.0/12 - Private network (RFC 1918: 172.16.0.0 - 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.0.0.0/24 - IETF Protocol Assignments (RFC 6890)
  if (a === 192 && b === 0 && c === 0) return true;

  // 192.0.2.0/24 - TEST-NET-1 (RFC 5737)
  if (a === 192 && b === 0 && c === 2) return true;

  // 192.88.99.0/24 - 6to4 Relay Anycast (RFC 3068)
  if (a === 192 && b === 88 && c === 99) return true;

  // 192.168.0.0/16 - Private network (RFC 1918)
  if (a === 192 && b === 168) return true;

  // 198.18.0.0/15 - Network Benchmark (RFC 2544: 198.18.0.0 - 198.19.255.255)
  if (a === 198 && (b === 18 || b === 19)) return true;

  // 198.51.100.0/24 - TEST-NET-2 (RFC 5737)
  if (a === 198 && b === 51 && c === 100) return true;

  // 203.0.113.0/24 - TEST-NET-3 (RFC 5737)
  if (a === 203 && b === 0 && c === 113) return true;

  // 224.0.0.0/4 - Multicast (RFC 5771: 224.0.0.0 - 239.255.255.255)
  if (a >= 224 && a <= 239) return true;

  // 240.0.0.0/4 - Reserved / Future Use / Broadcast (RFC 1112: 240.0.0.0 - 255.255.255.255)
  if (a >= 240) return true;

  // Alibaba Cloud metadata service (100.100.100.200)
  if (a === 100 && b === 100 && c === 100 && d === 200) return true;

  return false;
}

/**
 * Parses an IPv6 string into 8 16-bit word numbers [w0..w7].
 * Supports standard, compressed ('::'), and IPv4-mapped IPv6 formats.
 */
export function parseIPv6(ip) {
  if (typeof ip !== 'string') return null;
  let clean = ip.trim().toLowerCase();

  // Strip enclosing brackets if present
  if (clean.startsWith('[') && clean.endsWith(']')) {
    clean = clean.slice(1, -1);
  }

  // Handle IPv4-mapped suffix (e.g. ::ffff:192.168.1.1 or 0:0:0:0:0:ffff:127.0.0.1)
  let ipv4Mapped = null;
  const lastColon = clean.lastIndexOf(':');
  if (lastColon !== -1 && clean.slice(lastColon + 1).includes('.')) {
    const v4Part = clean.slice(lastColon + 1);
    const v4Octets = parseIPv4(v4Part);
    if (!v4Octets) return null;
    ipv4Mapped = v4Octets;
    clean = clean.slice(0, lastColon) + ':0:0'; // temporary placeholder for 2 words
  }

  const parts = clean.split('::');
  if (parts.length > 2) return null; // Only one '::' allowed

  let words = [];
  if (parts.length === 2) {
    const left = parts[0] ? parts[0].split(':').map(h => parseInt(h, 16)) : [];
    const right = parts[1] ? parts[1].split(':').map(h => parseInt(h, 16)) : [];
    const totalPresent = left.length + right.length;
    if (totalPresent > 8) return null;
    const omittedCount = 8 - totalPresent;
    const middle = new Array(omittedCount).fill(0);
    words = [...left, ...middle, ...right];
  } else {
    words = clean.split(':').map(h => parseInt(h, 16));
  }

  if (words.length !== 8 || words.some(w => isNaN(w) || w < 0 || w > 0xffff)) {
    return null;
  }

  if (ipv4Mapped) {
    words[6] = (ipv4Mapped[0] << 8) | ipv4Mapped[1];
    words[7] = (ipv4Mapped[2] << 8) | ipv4Mapped[3];
  }

  return words;
}

/**
 * Checks if an IPv6 address is private, loopback, link-local, unique-local, multicast, or IPv4-mapped private.
 */
export function isPrivateOrReservedIPv6(ip) {
  const words = parseIPv6(ip);
  if (!words) return true; // Invalid IPv6 is unsafe

  // ::/128 - Unspecified
  if (words.every(w => w === 0)) return true;

  // ::1/128 - Loopback
  if (words.slice(0, 7).every(w => w === 0) && words[7] === 1) return true;

  // ::ffff:0:0/96 or ::ffff:0:0:0/96 - IPv4-mapped IPv6
  if (words.slice(0, 5).every(w => w === 0) && words[5] === 0xffff) {
    const v4a = words[6] >> 8;
    const v4b = words[6] & 0xff;
    const v4c = words[7] >> 8;
    const v4d = words[7] & 0xff;
    return isPrivateOrReservedIPv4(`${v4a}.${v4b}.${v4c}.${v4d}`);
  }

  // fe80::/10 - Link-Local Unicast (RFC 4291)
  if ((words[0] & 0xffc0) === 0xfe80) return true;

  // fc00::/7 - Unique Local Address (RFC 4193: fc00::/8 and fd00::/8)
  if ((words[0] & 0xfe00) === 0xfc00) return true;

  // ff00::/8 - Multicast (RFC 4291)
  if ((words[0] & 0xff00) === 0xff00) return true;

  // 2001:db8::/32 - Documentation (RFC 3849)
  if (words[0] === 0x2001 && words[1] === 0x0db8) return true;

  // 2002::/16 - 6to4 prefix (RFC 3056)
  if (words[0] === 0x2002) return true;

  // 100::/64 - Discard-Only prefix (RFC 6666)
  if (words[0] === 0x0100 && words[1] === 0 && words[2] === 0 && words[3] === 0) return true;

  // 64:ff9b::/96 - IPv4/IPv6 translation (RFC 6052)
  if (words[0] === 0x0064 && words[1] === 0xff9b && words[2] === 0 && words[3] === 0 && words[4] === 0 && words[5] === 0) {
    const v4a = words[6] >> 8;
    const v4b = words[6] & 0xff;
    const v4c = words[7] >> 8;
    const v4d = words[7] & 0xff;
    return isPrivateOrReservedIPv4(`${v4a}.${v4b}.${v4c}.${v4d}`);
  }

  return false;
}

/**
 * Checks if an IP (IPv4 or IPv6) is in a private, loopback, or reserved range.
 */
export function isPrivateOrReservedIP(ip) {
  if (!ip || typeof ip !== 'string') return true;
  const clean = ip.trim();

  const ipFamily = net.isIP(clean);
  if (ipFamily === 4) {
    return isPrivateOrReservedIPv4(clean);
  } else if (ipFamily === 6) {
    return isPrivateOrReservedIPv6(clean);
  }

  // Non-standard formats (e.g. hex, octal, decimal dword) are strictly rejected
  return true;
}

// Disallowed internal hostname suffixes
const FORBIDDEN_HOST_SUFFIXES = [
  'localhost',
  'localdomain',
  'local',
  'internal',
  'lan',
  'corp',
  'home',
  'intranet',
  'arpa',
  'invalid',
  'test'
];

// Disallowed internal host names
const FORBIDDEN_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '[::1]',
  'metadata.google.internal',
  'instance-data',
  'metadata',
  '169.254.169.254'
]);

// Allowed safe ports for public citation verification
const ALLOWED_PORTS = new Set(['', '80', '443', '8080', '8443']);

/**
 * Validates the lexical and structural properties of a URL.
 * Rejects non-http(s) schemes, credentials, dangerous ports, control characters, and suspicious hostnames.
 */
export function validateUrlStructure(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { safe: false, reason: 'Empty or invalid URL parameter' };
  }

  const trimmed = rawUrl.trim();
  if (trimmed.length > 2048) {
    return { safe: false, reason: 'URL length exceeds maximum allowable 2048 characters' };
  }

  // Reject ASCII control characters
  if (/[\x00-\x1F\x7F]/.test(trimmed)) {
    return { safe: false, reason: 'URL contains illegal control characters' };
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch (err) {
    return { safe: false, reason: 'Malformed URL structure' };
  }

  // Strict protocol allowlist
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { safe: false, reason: `Disallowed protocol "${parsed.protocol}". Only http: and https: are allowed.` };
  }

  // Reject embedded credentials (e.g. http://user:pass@evil.com)
  if (parsed.username || parsed.password || trimmed.includes('@')) {
    return { safe: false, reason: 'URLs with embedded userinfo credentials are not permitted' };
  }

  // Validate port
  if (!ALLOWED_PORTS.has(parsed.port)) {
    return { safe: false, reason: `Port ${parsed.port} is not permitted for citation requests` };
  }

  const rawHostname = parsed.hostname.toLowerCase();
  if (!rawHostname) {
    return { safe: false, reason: 'URL must contain a valid hostname' };
  }

  // Strip brackets for IPv6 hostname checks
  const cleanHostname = rawHostname.startsWith('[') && rawHostname.endsWith(']')
    ? rawHostname.slice(1, -1)
    : rawHostname;

  // Direct check against forbidden hostnames
  if (FORBIDDEN_HOSTNAMES.has(cleanHostname) || FORBIDDEN_HOSTNAMES.has(rawHostname)) {
    return { safe: false, reason: `Access to "${rawHostname}" is prohibited` };
  }

  // Check forbidden domain suffixes (.local, .internal, etc.)
  for (const suffix of FORBIDDEN_HOST_SUFFIXES) {
    if (cleanHostname === suffix || cleanHostname.endsWith(`.${suffix}`)) {
      return { safe: false, reason: `Hostname suffix ".${suffix}" is prohibited` };
    }
  }

  // Reject suspicious numeric / octal / hex representations in hostnames (e.g. 0177.0.0.1, 0x7f000001, 2130706433)
  if (/^0x[0-9a-f]+$/i.test(cleanHostname) || /^\d+$/.test(cleanHostname) || /^0\d+/.test(cleanHostname)) {
    return { safe: false, reason: 'Non-standard numeric/hex host representations are prohibited' };
  }

  // If the hostname is an IP literal, validate it immediately
  const isDirectIp = net.isIP(cleanHostname);
  if (isDirectIp) {
    if (isPrivateOrReservedIP(cleanHostname)) {
      return { safe: false, reason: `IP address "${cleanHostname}" is in a private/reserved address space` };
    }
  }

  return { safe: true, parsedUrl: parsed, cleanHostname };
}

/**
 * Validates the URL structure and asynchronously resolves DNS to verify that NO resolved IP is private.
 * Protects against hostname resolution bypasses and DNS-level internal targeting.
 */
export async function validateUrlAndResolveDns(rawUrl) {
  const structCheck = validateUrlStructure(rawUrl);
  if (!structCheck.safe) {
    return structCheck;
  }

  const { parsedUrl, cleanHostname } = structCheck;

  // If already verified as a public IP literal, return safe
  if (net.isIP(cleanHostname)) {
    return { safe: true, parsedUrl, resolvedIps: [cleanHostname] };
  }

  // Resolve hostname via DNS
  try {
    const records = await dns.promises.lookup(cleanHostname, { all: true, verbatim: true });
    if (!records || records.length === 0) {
      return { safe: false, reason: `Could not resolve hostname "${cleanHostname}"` };
    }

    const resolvedIps = [];
    for (const record of records) {
      const ip = record.address;
      resolvedIps.push(ip);
      if (isPrivateOrReservedIP(ip)) {
        return { safe: false, reason: `Hostname "${cleanHostname}" resolved to prohibited IP "${ip}"` };
      }
    }

    return { safe: true, parsedUrl, resolvedIps };
  } catch (err) {
    return { safe: false, reason: `DNS lookup failed for "${cleanHostname}": ${err.message}` };
  }
}

/**
 * Safe DNS lookup function for socket connections (DNS rebinding defense).
 * Validates resolved addresses at TCP socket connection time.
 */
function createSafeLookup() {
  return (hostname, options, callback) => {
    dns.lookup(hostname, options, (err, address, family) => {
      if (err) return callback(err);

      if (Array.isArray(address)) {
        for (const item of address) {
          if (isPrivateOrReservedIP(item.address)) {
            return callback(new Error(`SSRF_BLOCKED: Connection to private IP "${item.address}" rejected`));
          }
        }
        return callback(null, address, family);
      }

      if (isPrivateOrReservedIP(address)) {
        return callback(new Error(`SSRF_BLOCKED: Connection to private IP "${address}" rejected`));
      }

      callback(null, address, family);
    });
  };
}

/**
 * Performs a safe outbound HTTP/HTTPS request for citation verification.
 * Enforces:
 * - Strict URL & DNS pre-validation
 * - Socket-level DNS rebinding defense via custom safe lookup
 * - Non-following of unvalidated redirects (max 2 validated hops)
 * - Strict timeout bounds (1500ms total)
 * - Response size capping (reads headers only, destroys stream immediately)
 * - HEAD with GET fallback
 */
export async function safeFetchCitation(rawUrl, maxRedirects = 2, timeoutMs = 1500) {
  let currentUrl = rawUrl;
  let hopsRemaining = maxRedirects;
  const startTime = Date.now();

  while (hopsRemaining >= 0) {
    const elapsed = Date.now() - startTime;
    const remainingTime = Math.max(200, timeoutMs - elapsed);

    // Step 1: Validate URL and resolve DNS
    const check = await validateUrlAndResolveDns(currentUrl);
    if (!check.safe) {
      console.warn(`[SSRF Defense] Rejected unsafe citation URL "${currentUrl}": ${check.reason}`);
      return { reachable: false, status: 0, reason: check.reason, url: null };
    }

    // Step 2: Attempt safe HEAD request
    let response = await executeSafeRequest(check.parsedUrl, 'HEAD', remainingTime);

    // If server rejects HEAD with 405 Method Not Allowed, fallback to GET (header-only)
    if (response && response.status === 405) {
      const getRemaining = Math.max(200, timeoutMs - (Date.now() - startTime));
      response = await executeSafeRequest(check.parsedUrl, 'GET', getRemaining);
    }

    if (!response) {
      return { reachable: false, status: 0, reason: 'Network error or timeout', url: null };
    }

    // Step 3: Handle redirects securely
    if (response.status >= 300 && response.status < 400 && response.headers.location) {
      hopsRemaining--;
      if (hopsRemaining < 0) {
        console.warn(`[SSRF Defense] Exceeded maximum allowable redirects (2) for citation URL: "${rawUrl}"`);
        return { reachable: false, status: response.status, reason: 'Too many redirects', url: null };
      }

      try {
        const nextUrl = new URL(response.headers.location, currentUrl).href;
        currentUrl = nextUrl;
        continue;
      } catch (err) {
        return { reachable: false, status: response.status, reason: 'Invalid redirect Location header', url: null };
      }
    }

    // Step 4: Evaluate HTTP Status
    const isOk = response.status >= 200 && response.status < 400;
    return {
      reachable: isOk,
      status: response.status,
      url: isOk ? currentUrl : null,
      reason: isOk ? 'OK' : `HTTP ${response.status}`
    };
  }

  return { reachable: false, status: 0, reason: 'Redirect limit reached', url: null };
}

/**
 * Low-level HTTP/HTTPS request execution with socket lookup interceptor and response truncation.
 */
function executeSafeRequest(parsedUrl, method = 'HEAD', timeoutMs = 1500) {
  return new Promise((resolve) => {
    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    const reqOptions = {
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: (parsedUrl.pathname || '/') + (parsedUrl.search || ''),
      method: method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; InsightLensCitationBot/1.0)',
        'Accept': '*/*',
        'Range': 'bytes=0-1024' // For GET requests, limit requested body range
      },
      lookup: createSafeLookup(),
      timeout: timeoutMs
    };

    let settled = false;
    const safeResolve = (val) => {
      if (!settled) {
        settled = true;
        resolve(val);
      }
    };

    const req = client.request(reqOptions, (res) => {
      // Consume minimal response headers and immediately destroy socket to avoid downloading large files
      res.resume(); // Flush stream without buffering
      req.destroy();

      safeResolve({
        status: res.statusCode || 0,
        headers: res.headers || {}
      });
    });

    req.on('timeout', () => {
      req.destroy();
      safeResolve(null);
    });

    req.on('error', (err) => {
      req.destroy();
      safeResolve(null);
    });

    // Close request body immediately
    req.end();
  });
}
