exports.handler = async function handler() {
  const config = {
    ACTIVE_PRODUCT: process.env.ACTIVE_PRODUCT || '',
    PRODUCT_PROFILE: process.env.PRODUCT_PROFILE || '',
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
    SUPABASE_SCHEMA: process.env.SUPABASE_SCHEMA || '',
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
