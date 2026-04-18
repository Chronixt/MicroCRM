exports.handler = async function handler() {
  const config = {
    GIT_BRANCH: process.env.BRANCH || process.env.HEAD || '',
    NETLIFY_BRANCH: process.env.BRANCH || '',
    NETLIFY_CONTEXT: process.env.CONTEXT || '',
    ACTIVE_PRODUCT: process.env.ACTIVE_PRODUCT || '',
    PRODUCT_PROFILE: process.env.PRODUCT_PROFILE || '',
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
    SUPABASE_SCHEMA: process.env.SUPABASE_SCHEMA || '',
    SUPABASE_DEV_SCHEMA: process.env.SUPABASE_DEV_SCHEMA || '',
    FORCE_LIVE_SCHEMA: String(process.env.FORCE_LIVE_SCHEMA || '').toLowerCase() === 'true',
    APP_ENV_LABEL: process.env.APP_ENV_LABEL || '',
    SHOW_ENV_BANNER: String(process.env.SHOW_ENV_BANNER || '').toLowerCase() === 'true',
    ENABLE_AUTO_CLAIM_UNOWNED_DATA: String(process.env.ENABLE_AUTO_CLAIM_UNOWNED_DATA || '').toLowerCase() === 'true',
    ALLOW_DESTRUCTIVE_WIPE: String(process.env.ALLOW_DESTRUCTIVE_WIPE || '').toLowerCase() === 'true',
    USE_SUPABASE: String(process.env.USE_SUPABASE || '').toLowerCase() === 'true',
    REQUIRE_LOGIN: String(process.env.REQUIRE_LOGIN || '').toLowerCase() === 'true',
    ADDRESS_LOOKUP_ENABLED: String(process.env.ADDRESS_LOOKUP_ENABLED || '').toLowerCase() === 'true',
    ADDRESS_LOOKUP_PROVIDER: process.env.ADDRESS_LOOKUP_PROVIDER || '',
    ADDRESS_LOOKUP_COUNTRY_CODES: process.env.ADDRESS_LOOKUP_COUNTRY_CODES || '',
    GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY || ''
  };

  const body = `;(function(){\n${Object.entries(config)
    .map(([key, value]) => `window.${key} = ${JSON.stringify(value)};`)
    .join('\n')}\n})();`;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0'
    },
    body
  };
};
