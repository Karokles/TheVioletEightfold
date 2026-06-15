import dotenv from 'dotenv';

dotenv.config();

export type AppEnvironment = 'local' | 'staging' | 'production';

const truthy = new Set(['1', 'true', 'yes', 'on', 'enabled']);
const falsy = new Set(['0', 'false', 'no', 'off', 'disabled']);

const readBoolean = (name: string, fallback: boolean): boolean => {
  const raw = process.env[name];
  if (raw === undefined) {
    return fallback;
  }

  const normalized = raw.trim().toLowerCase();
  if (truthy.has(normalized)) {
    return true;
  }
  if (falsy.has(normalized)) {
    return false;
  }

  console.warn(`[CONFIG] Invalid boolean for ${name}: "${raw}". Falling back to ${fallback}.`);
  return fallback;
};

const readEnvironment = (): AppEnvironment => {
  const explicit = process.env.APP_ENV?.trim().toLowerCase();
  if (explicit === 'local' || explicit === 'staging' || explicit === 'production') {
    return explicit;
  }

  const renderBranch = process.env.RENDER_GIT_BRANCH?.trim().toLowerCase();
  if (renderBranch === 'staging') {
    return 'staging';
  }

  return process.env.NODE_ENV === 'production' ? 'production' : 'local';
};

const appEnvironment = readEnvironment();
const defaultStrict = appEnvironment !== 'local';

export const runtimeConfig = {
  appEnvironment,
  isLocal: appEnvironment === 'local',
  isStaging: appEnvironment === 'staging',
  isProduction: appEnvironment === 'production',
  aiProviderEnabled: readBoolean('AI_PROVIDER_ENABLED', false),
  databaseEnabled: readBoolean('DATABASE_ENABLED', appEnvironment !== 'local'),
  paymentEnabled: readBoolean('PAYMENT_ENABLED', false),
  supabaseAuthEnabled: readBoolean('SUPABASE_AUTH_ENABLED', appEnvironment === 'staging'),
  authStrictMode: readBoolean('AUTH_STRICT_MODE', defaultStrict),
  usageLimitsEnabled: readBoolean('USAGE_LIMITS_ENABLED', appEnvironment !== 'local'),
  debugEndpointsEnabled: readBoolean('DEBUG_ENDPOINTS_ENABLED', appEnvironment !== 'production'),
  localAuthEnabled: readBoolean('LOCAL_AUTH_ENABLED', appEnvironment === 'local'),
  weeklyFreeInteractions: Number(process.env.WEEKLY_FREE_INTERACTIONS || 25),
  weeklyCouncilSessions: Number(process.env.WEEKLY_COUNCIL_SESSIONS || 5),
  weeklyMeaningAnalyses: Number(process.env.WEEKLY_MEANING_ANALYSES || 10),
  offlineOnlyIdentifiers: process.env.OFFLINE_ONLY_IDENTIFIERS || '',
  founderAccessIdentifiers: process.env.FOUNDER_ACCESS_IDENTIFIERS || '',
  adminIdentifiers: process.env.ADMIN_IDENTIFIERS || '',
  jwtSecret: process.env.JWT_SECRET,
  openAiApiKey: process.env.OPENAI_API_KEY,
  openAiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || process.env.PAYMENT_PROVIDER_SECRET,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  stripeBetaPriceId: process.env.STRIPE_BETA_PRICE_ID,
  stripePaymentLinkUrl: process.env.STRIPE_BETA_PAYMENT_LINK_URL,
  frontendAppUrl: process.env.FRONTEND_APP_URL || process.env.PUBLIC_APP_URL,
  hasDatabaseCredentials: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
  hasPaymentCredentials: !!(
    (process.env.STRIPE_SECRET_KEY || process.env.PAYMENT_PROVIDER_SECRET)
    && (process.env.STRIPE_BETA_PRICE_ID || process.env.STRIPE_BETA_PAYMENT_LINK_URL)
  ),
};

export const serviceReadiness = {
  ai: runtimeConfig.aiProviderEnabled && !!runtimeConfig.openAiApiKey,
  database: runtimeConfig.databaseEnabled && runtimeConfig.hasDatabaseCredentials,
  supabaseAuth: runtimeConfig.supabaseAuthEnabled && runtimeConfig.hasDatabaseCredentials,
  payment: runtimeConfig.paymentEnabled && runtimeConfig.hasPaymentCredentials,
  auth: !runtimeConfig.authStrictMode || !!runtimeConfig.jwtSecret,
};

export const getCredentialWarnings = (): string[] => {
  const warnings: string[] = [];

  if (runtimeConfig.aiProviderEnabled && !runtimeConfig.openAiApiKey) {
    warnings.push('AI_PROVIDER_ENABLED=true but OPENAI_API_KEY is missing. AI routes will use safe mock responses.');
  }
  if (runtimeConfig.databaseEnabled && !runtimeConfig.hasDatabaseCredentials) {
    warnings.push('DATABASE_ENABLED=true but Supabase credentials are missing. Database writes/reads are disabled.');
  }
  if (runtimeConfig.paymentEnabled && !runtimeConfig.stripeSecretKey) {
    warnings.push('PAYMENT_ENABLED=true but STRIPE_SECRET_KEY is missing. Stripe checkout will be disabled.');
  }
  if (runtimeConfig.paymentEnabled && !runtimeConfig.stripeBetaPriceId && !runtimeConfig.stripePaymentLinkUrl) {
    warnings.push('PAYMENT_ENABLED=true but neither STRIPE_BETA_PRICE_ID nor STRIPE_BETA_PAYMENT_LINK_URL is set. Payment routes will not have a checkout target.');
  }
  if (runtimeConfig.paymentEnabled && runtimeConfig.stripeSecretKey && !runtimeConfig.stripeWebhookSecret) {
    warnings.push('PAYMENT_ENABLED=true but STRIPE_WEBHOOK_SECRET is missing. Stripe payments will not auto-activate access.');
  }
  if (runtimeConfig.supabaseAuthEnabled && !runtimeConfig.hasDatabaseCredentials) {
    warnings.push('SUPABASE_AUTH_ENABLED=true but Supabase credentials are missing. Supabase Auth token verification is disabled.');
  }
  if (runtimeConfig.authStrictMode && !runtimeConfig.jwtSecret) {
    warnings.push('AUTH_STRICT_MODE=true but JWT_SECRET is missing. Login/protected auth will fail safely.');
  }
  if (runtimeConfig.isProduction && runtimeConfig.debugEndpointsEnabled) {
    warnings.push('DEBUG_ENDPOINTS_ENABLED=true in production. Diagnostic endpoints may expose operational details.');
  }
  if (!runtimeConfig.isLocal && runtimeConfig.localAuthEnabled) {
    warnings.push('LOCAL_AUTH_ENABLED=true outside local mode. Hardcoded local test users must not be used for real users.');
  }

  return warnings;
};
