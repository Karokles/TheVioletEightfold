# Local Test Credentials

This file documents local fallback users for development only. Production accounts are created through Supabase Auth and the admin panel.

## Local Users

| Username | Secret source | Access |
|----------|---------------|--------|
| `lion` | `LOCAL_SECRET_LION` or `dev-lion-secret` | Founder / protected local |
| `selma` | `LOCAL_SECRET_SELMA` or `dev-selma-secret` | Test |
| `alicia` | `LOCAL_SECRET_ALICIA` or `dev-alicia-secret` | Test |
| `marie` | `LOCAL_SECRET_MARIE` or `dev-marie-secret` | Test |
| `friend5` | `LOCAL_SECRET_FRIEND5` or `dev-friend5-secret` | Test |
| `sophia` | `LOCAL_SECRET_SOPHIA` or `dev-sophia-secret` | Test |
| `isabell` | `LOCAL_SECRET_ISABELL` or `dev-isabell-secret` | Test |
| `dorothee` | `LOCAL_SECRET_DOROTHEE` or `dev-dorothee-secret` | Test |
| `serigne` | `LOCAL_SECRET_SERIGNE` or `dev-serigne-secret` | Test |
| `benjamin` | `LOCAL_SECRET_BENJAMIN` or `dev-benjamin-secret` | Test |
| `anna` | `LOCAL_SECRET_ANNA` or `dev-anna-secret` | Test |
| `tuana` | `LOCAL_SECRET_TUANA` or `dev-tuana-secret` | Founder / full local access |

## Usage

Local fallback login is intended for development only and requires `LOCAL_AUTH_ENABLED=true`.

Example:
- Username: `lion`
- Secret: `dev-lion-secret`

## Security Note

For production:
1. Keep `LOCAL_AUTH_ENABLED=false`.
2. Create accounts through Supabase Auth and the admin panel.
3. Never commit real user passwords or service keys.
4. Use environment variables for any local-only overrides.

## Location in Code

The local fallback user list is defined in `server/server.ts`.
