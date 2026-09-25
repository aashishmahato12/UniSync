# Connect each student's own Gmail

The app can now ask each signed-in student to connect Gmail from **Profile → Integrations**. A shared n8n schedule calls UniSync's server once per minute. The server refreshes that student's Google token, imports their Herald College messages, saves extracted events and supported attachments under their user ID, and sends their queued college emails from their own mailbox. Google refresh tokens stay encrypted on the server and are never returned to the browser or n8n. The original account keeps its existing Gmail workflows. Its owner can also connect that same mailbox in Profile to test historical imports; the new importer reuses legacy Gmail IDs to avoid duplicate notices, while the old n8n sender remains responsible for that account's outgoing messages.

## Before enabling the Connect Gmail button

1. Run `004_college_attachments.sql` for incoming files and `007_college_email_jobs.sql` for outbound college email. `003_payment_receipts.sql` is optional. Then rerun `009_private_self_signup.sql` if any of these tables were added after it. Finally run [010_user_mail_connections.sql](./010_user_mail_connections.sql). The `010` migration limits the original n8n send and receipt workflows to the original owner. If you install an optional table later, rerun `009` followed by `010` before using it.
2. In Google Cloud, enable the Gmail API and create a **Web application** OAuth client. Register the exact redirect URI `https://unisync-dun.vercel.app/api/mail-callback`. Configure the consent screen for `gmail.readonly` and `gmail.send`. Google classifies `gmail.readonly` as a **restricted scope**. A public production app may need OAuth verification and a security assessment before arbitrary users can connect. During testing, add testers in the Google Cloud consent screen. See [Google's Gmail scope list](https://developers.google.com/workspace/gmail/api/auth/scopes) and [web-server OAuth guide](https://developers.google.com/identity/protocols/oauth2/web-server).
3. Set these **server-only** environment variables in Vercel (never use a `VITE_` prefix for secrets):

   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase service-role key.
   - `UNISYNC_APP_ORIGIN`: `https://unisync-dun.vercel.app` (no path).
   - `UNISYNC_GOOGLE_CLIENT_ID` and `UNISYNC_GOOGLE_CLIENT_SECRET`: Google OAuth web client.
   - `UNISYNC_MAIL_TOKEN_KEY`: a random 32-byte value encoded as base64. Generate locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`.
   - `UNISYNC_N8N_MAIL_SYNC_SECRET`: a random secret of at least 32 characters.
   - `UNISYNC_N8N_MAIL_EXTRACT_URL`: the **production** webhook URL of the extraction workflow below.
   - `UNISYNC_N8N_MAIL_EXTRACT_SECRET`: a separate random secret for that webhook.

   Keep `UNISYNC_MAIL_TOKEN_KEY` stable and backed up securely. Changing it makes existing connected mailboxes require reconnection.

4. Import [user-mail-extract.json](./user-mail-extract.json) into n8n. Select the existing Gemini credential on **Google Gemini Chat Model**. On **Private Mail Webhook**, select a **Header Auth** credential whose header name is `X-UniSync-Mail-Secret` and value matches `UNISYNC_N8N_MAIL_EXTRACT_SECRET`. Activate the workflow and copy its production URL to Vercel. This workflow only extracts facts; the server validates and writes each student's data.
5. Import [user-mail-sync.json](./user-mail-sync.json) into n8n. Select a different **HTTP Header Auth** credential on **Sync One Mailbox**, with header name `X-UniSync-Mail-Sync-Secret` and value matching `UNISYNC_N8N_MAIL_SYNC_SECRET`. Keep it inactive until a test connection succeeds. Then activate it. It processes one connected account per run; run it more often or increase capacity if many students connect.
6. Deploy the app and API routes. Sign in with a **new test account**, open Profile, connect its Gmail, and check that only that account's college messages, events and supported PDF/JPG/PNG attachments appear. Send one non-sensitive test email to a verified `@heraldcollege.edu.np` address and confirm the message ID, sender, and Sent folder. Sign in as another user and confirm the first user's data is absent. Disconnect the test Gmail and confirm sending is disabled.

The connected-mail importer pages through Herald-sender messages without a 90-day cutoff and imports two messages per run. Older messages appear gradually as the scheduled workflow repeats. For Ask AI to read uploaded attachment contents, also apply `005_attachment_text.sql` and activate the existing attachment-reader workflow. Existing original-account intake and calendar/receipt workflows remain separate. New users' Google Calendar and payment-receipt sending are not connected by this Gmail feature.

Do not activate the shared sync workflow before the SQL migration, OAuth client, API environment, and extraction webhook are ready. Google consent credentials and Supabase service keys belong in Vercel/n8n only.
