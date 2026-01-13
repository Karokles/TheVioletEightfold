# User Credentials

This file contains the test user credentials for The Violet Eightfold app.

## Test Users

| Username | Secret (Password) |
|----------|------------------|
| `lion` | `TuerOhneWiederkehr2025` |
| `selma` | `moonlight-whisper` |
| `alicia` | `form-follows-function` |
| `marie` | `haute-couture` |
| `friend5` | `friend5-test-secret` |
| `sophia` | `know-thyself` |
| `isabell` | `ceylon` |
| `dorothee` | `schattengarten` |
| `serigne` | `cher-amadu` |
| `galja` | `kalmykia` |
| `benjamin` | `tragwerk` |
| `anna` | `amethyst` |

## Usage

When logging into the app, use:
- **Username**: One of the usernames from the table above
- **Secret**: The corresponding secret/password from the table

## Example

To log in as selma:
- Username: `selma`
- Secret: `moonlight-whisper`

## Security Note

⚠️ **For Production**: These are test credentials. In production, you should:
1. Store user credentials in a secure database
2. Use proper password hashing (already implemented with SHA-256)
3. Never commit real user passwords to the repository
4. Consider implementing proper authentication with JWT tokens or OAuth

## Location in Code

These credentials are defined in `server/server.ts` (lines 156-214).

**Notes**:
- The password for `sophia` is `know-thyself` - a reference to the Socratic maxim "γνῶθι σεαυτόν" (know thyself), fitting for a wisdom-seeking user named after the Greek word for wisdom.
- The password for `isabell` is `ceylon` - a subtle reference to the former name of Sri Lanka.
- The password for `galja` is `kalmykia` - a reference to the Republic of Kalmykia, the only region in Europe with a Buddhist majority population.
- The password for `benjamin` is `tragwerk` - a reference to structural engineering (Tragwerk = load-bearing structure in German), fitting for a civil engineer.
- The password for `anna` is `amethyst` - a reference to the purple gemstone, fitting for The Violet Eightfold app's purple theme.

