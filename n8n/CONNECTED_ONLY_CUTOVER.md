# Connected Gmail cutover and fresh start

The original UniSync account now uses the same connected-Gmail sync as every
other student. A separate n8n schedule still calls `/api/mail-sync`; n8n's
connected mailbox extraction and private AI chat workflows still run Gemini.

Before resetting saved data:

1. Keep the old **Herald College — Gmail notices to Supabase**, **Herald College — save Gmail attachments privately**, **UniSync — send college emails with Gmail**, and **UniSync — send payment receipts with Gmail** workflows unpublished. Keep their definitions for recovery until the cutover is verified.
2. Pause **Gmail Herald Time** and **UniSync — approved events to Google Calendar**. The latter uses one Calendar credential for all approved rows, so it must not run for multiple students. This pauses Google Calendar creation; the app's private calendar remains available.
3. Temporarily unpublish **UniSync — Connected mail sync and send** while clearing data. Keep **UniSync — Connected mailbox extraction**, **Herald College — private AI chat (Gemini)**, and **Herald College — read PDF and image attachments** published.
4. Disconnect `mahatoaashish5@gmail.com` from the temporary UniSync test account, if attached there. One Gmail address can belong to only one UniSync account.
5. Deploy the app update and run `012_connected_only_mail.sql` in the Supabase SQL Editor. It requires a connected mailbox for email queuing and prevents an accidentally republished legacy sender from claiming jobs after the original owner connects Gmail.
6. Run `node n8n/reset-saved-data.mjs` locally to preview row counts. The script needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the local process environment; never paste the key into chat or commit it. With the timers paused and counts checked, run `node n8n/reset-saved-data.mjs --execute --timers-paused`. It empties the three private file buckets and the seven saved-data tables while preserving accounts, Gmail connections, table schemas, and buckets. It resets mailbox sync order. This does not delete messages from anyone's Gmail account or remove Google Calendar events already created there.
7. Sign into the original UniSync account and connect `mahatoaashish5@gmail.com` from **Profile → Integrations**. Then republish **UniSync — Connected mail sync and send**. The server imports up to two older Herald messages per run for each connected mailbox. Old mail will gradually reappear by design.
8. Verify one imported notice, attachment, college-email delivery, and sample payment receipt. Receipts still go to UniSync's test inbox `aashishmahato8000@gmail.com`; do not submit real receipts as college payments yet.

The reset also starts fresh browser-local Paid/Due and read-notice markers through new storage keys. It does not delete old keys from visitors' browsers, but the app no longer reads them.
