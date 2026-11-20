# Bintang CRM

Omnichannel CRM for WhatsApp, Facebook Messenger and Instagram Direct, with contacts, support cases and interaction logging. Built with Next.js and Supabase, deployed on Vercel.

## How the Meta integration works

- **Inbound**: Meta sends every customer message to `POST /api/meta/webhook`. The signature (`X-Hub-Signature-256`) is verified with your app secret, the sender is matched to (or created as) a contact, and the message is appended to their conversation. Duplicate deliveries are ignored.
- **Outbound**: replying in a conversation that came from Meta sends the message through the Graph API (WhatsApp Cloud API or the Messenger/Instagram Send API) and records Meta's message id, so delivery and read ticks update.
- **Tokens** are AES-256-GCM encrypted (`META_TOKEN_ENCRYPTION_KEY`) and stored in `crm_channel_secrets`, which only the server's service role can read.
- The inbox refreshes every 8 seconds, so new messages appear without reloading.

## Setup

### 1. Database
Apply both files in `supabase/migrations/` to the Supabase project (SQL editor or `supabase db push`).

### 2. Environment variables (Vercel → Project → Settings → Environment Variables)

| Variable | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase integration (already set) |
| `META_APP_ID` | Meta App Dashboard → App settings → Basic |
| `META_APP_SECRET` | Same page (App secret) |
| `META_VERIFY_TOKEN` | Any random string; paste the same value into Meta's webhook settings |
| `META_TOKEN_ENCRYPTION_KEY` | Any long random string (keep it stable: changing it invalidates stored tokens) |
| `META_LOGIN_CONFIG_ID` | Optional: Facebook Login for Business configuration id |
| `META_GRAPH_VERSION` | Optional, defaults to `v26.0` |

### 3. Meta app (developers.facebook.com/apps)
1. Create a **Business** app and add the **WhatsApp**, **Messenger** and **Instagram** products, plus **Facebook Login for Business**.
2. Facebook Login → Settings → Valid OAuth Redirect URIs: `https://<your-domain>/api/meta/oauth/callback`
3. Webhooks: for **WhatsApp Business Account**, **Page** and **Instagram**, set the callback URL to `https://<your-domain>/api/meta/webhook` with your `META_VERIFY_TOKEN`, then subscribe to `messages` (and `message_echoes`, `message_deliveries`, `message_reads` for Page).
4. While the app is in Development mode only app admins/testers can connect. Request Advanced Access for `pages_messaging`, `instagram_manage_messages` and `whatsapp_business_messaging` via App Review before going live with customers.

### 4. Connect channels in the app
Settings → Integrations:
- **Messenger + Instagram**: click *Continue with Facebook* and choose your Pages. Instagram professional accounts linked to those Pages are added automatically.
- **WhatsApp**: click *Add phone number* and paste the Phone number ID, WhatsApp Business Account ID and a permanent System User token.

### Notes
- WhatsApp only allows free-form replies within 24 hours of the customer's last message; after that Meta requires an approved template. The app shows Meta's error if a reply is rejected.
- Messenger and Instagram customers must message you first.

## Local development
```bash
pnpm install
pnpm dev   # without Supabase env vars the app runs in demo mode at /demo
```
