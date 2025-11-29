# User Credentials

This file contains the test user credentials for The Violet Eightfold app.

## Test Users

| Username | Secret (Password) |
|----------|------------------|
| `lion` | `TuerOhneWiederkehr2025` |
| `selma` | `moonlight-whisper` |
| `alicia` | `form-follows-function` |
| `marie` | `haute-couture` |
| `friend4` | `friend4-test-secret` |
| `friend5` | `friend5-test-secret` |

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

These credentials are defined in `server/server.ts` (lines 40-73).

