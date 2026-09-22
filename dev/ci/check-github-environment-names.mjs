// Confirms GitHub environment secret names. Prints names and missing entries only.
// Actions GITHUB_TOKEN receives 403 from this API. Run it with an admin token.
// Workflows prove injection by declaring environment: preview instead.
export const expectedSecretNames = {
  production: [
    'GOOGLE_MAPS_BROWSER_KEY',
    'GOOGLE_MAPS_SERVER_KEY',
    'GOOGLE_WORKSPACE_CLIENT_SECRET',
    'HCAPTCHA_SECRET_KEY',
    'INTUIT_CLIENT_SECRET',
    'KDF_SALT',
    'RESEND_API_KEY',
    'SUPABASE_ACCESS_TOKEN',
    'SUPABASE_DB_PASSWORD',
    'SUPABASE_SERVICE_ROLE_KEY',
    'TOKEN_ENCRYPTION_KEY',
    'VAPID_PRIVATE_KEY',
    'VERCEL_TOKEN',
  ],
  preview: [
    'GOOGLE_MAPS_BROWSER_KEY',
    'GOOGLE_MAPS_SERVER_KEY',
    'GOOGLE_WORKSPACE_CLIENT_SECRET',
    'HCAPTCHA_SECRET_KEY',
    'INTUIT_CLIENT_SECRET',
    'KDF_SALT',
    'RESEND_API_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'TOKEN_ENCRYPTION_KEY',
    'VAPID_PRIVATE_KEY',
  ],
};

export function missingSecretNames(presentByEnvironment) {
  const missing = [];
  for (const [environment, names] of Object.entries(expectedSecretNames)) {
    const present = presentByEnvironment[environment] ?? new Set();
    for (const name of names) {
      if (!present.has(name)) missing.push(`${environment}/${name}`);
    }
  }
  return missing;
}

const isDirectRun = process.argv[1] && process.argv[1].endsWith('check-github-environment-names.mjs');
if (isDirectRun) {
  await runCheck();
}

async function runCheck() {
const repo = process.env.GITHUB_REPOSITORY;
if (!repo) {
  console.error('GITHUB_REPOSITORY is required');
  process.exit(1);
}
if (!process.env.GH_TOKEN && !process.env.GITHUB_TOKEN) {
  console.error('GH_TOKEN or GITHUB_TOKEN is required');
  process.exit(1);
}

let missing = 0;
for (const [environment, names] of Object.entries(expectedSecretNames)) {
  const response = await fetch(
    `https://api.github.com/repos/${repo}/environments/${encodeURIComponent(environment)}/secrets`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${process.env.GH_TOKEN || process.env.GITHUB_TOKEN}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  );
  if (!response.ok) {
    console.error(`${environment}: GitHub API ${response.status}`);
    missing += names.length;
    continue;
  }
  const body = await response.json();
  const present = new Set((body.secrets || []).map((secret) => secret.name));
  for (const name of names) {
    if (present.has(name)) {
      console.log(`OK ${environment}/${name}`);
    } else {
      console.error(`MISSING ${environment}/${name}`);
      missing += 1;
    }
  }
}

if (missing > 0) {
  process.exit(1);
}
}
