# Herald College Student Assistant

A responsive React demo for college notices, events, a monthly calendar, payment receipts, documents, and a student AI assistant.

The first backend workflow is drafted in n8n. See the [n8n setup guide](./n8n/README.md) for the Gmail-to-Supabase intake flow and the remaining connection steps.

## Private account setup

UniSync uses email-link sign-in. Before deploying this version, run [`n8n/002_single_owner_access.sql`](./n8n/002_single_owner_access.sql) in the UniSync Supabase project's SQL Editor. It removes the existing anonymous access to college notices and events and allows only `mahatoaashish5@gmail.com`. In Supabase Authentication → URL Configuration, set the Site URL to `https://unisync-dun.vercel.app` and add `https://unisync-dun.vercel.app/**` to Redirect URLs. Add your local Vite URL there too if you want to test sign-in locally. Keep the Supabase secret/service-role key in n8n only; Vercel needs only the public URL and publishable key.

After deployment, enter the approved email at the sign-in page and open the emailed link. Other accounts can sign in, but cannot access the workspace or its notices and events. The Profile page shows the signed-in email and a sign-out button.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To verify the production bundle, run `npm run build` and then `npm run preview`.

## Current behavior and receipt setup

Notices and events load from Supabase; calendar approval states are saved there. After the notice-body migration and workflow update below, the Notices reader also shows the original plain-text college email inside UniSync. Payments use the Autumn 2026 batch schedule. You can mark each installment Due or Paid; those choices are saved in this browser only and are not college confirmations.

The payment form uploads a PDF/JPG/PNG receipt to private Supabase Storage and queues an email job only when `payment_receipt_settings.enabled` is true. The separate n8n workflow polls the queue, sends through Gmail, and updates the job status. The website shows that status; clicking Send first means **queued**, not delivered. The configured recipient is currently the owner's **test inbox**, so a test send is not a college submission. Follow the [receipt setup and test steps](./n8n/README.md) before using a real college address.

Documents reads private college PDF/image attachments from Supabase after the [attachment migration and n8n workflow](./n8n/README.md) are applied. The notice modal links to its saved files and original Gmail message.

## AI chat setup

Ask AI sends a limited set of relevant saved **notice summaries, event details, and extracted attachment text** from the signed-in owner's account to Gemini through your n8n webhook. It returns source links and can propose an **Add to Calendar** button. Only clicking that button approves the event; your existing calendar workflow performs the later Google Calendar sync. Student-marked fee statuses stay local.

1. Import [`n8n/herald-private-ai-chat.json`](./n8n/herald-private-ai-chat.json) into n8n. Assign your existing Gemini credential to **Google Gemini Chat Model**.
2. On **Private Chat Webhook**, create a **Header Auth** credential: header name `X-UniSync-AI-Secret`, value a long random secret you choose. Publish/activate the workflow and copy its **production** webhook URL.
3. In Vercel project settings, add server environment variables `UNISYNC_N8N_AI_URL` (that HTTPS production URL) and `UNISYNC_N8N_AI_SECRET` (the same secret). Keep existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Redeploy.

Never put `UNISYNC_N8N_AI_SECRET` in a `VITE_` variable. Local `npm run dev` uses saved-record search because Vite does not run Vercel API functions. On the live site, an unconfigured workflow shows an explicit error rather than pretending a search result is AI.

### Let AI read college attachments

1. Apply [`n8n/005_attachment_text.sql`](./n8n/005_attachment_text.sql) in Supabase SQL Editor. It adds private extracted-text fields to the existing owner-only attachment table.
2. Import [`n8n/herald-read-attachments.json`](./n8n/herald-read-attachments.json) into n8n as a **new inactive workflow**. Assign the existing Supabase `apikey` Header Auth credential to both **Get Pending** nodes, both **Download** nodes, and **Update Attachment Text**. Assign the existing Gemini credential to **Read PDF with Gemini** and **Read Image with Gemini**.
3. Run **Manual Test** on one non-sensitive college file first. Check its `extraction_status` becomes `Ready` and `extracted_text` contains actual file text in Supabase. If unreadable it becomes `No text`. Once verified, activate the reader; it processes up to five pending PDFs and five pending images every ten minutes.
4. Update your existing private AI chat workflow from the new [`n8n/herald-private-ai-chat.json`](./n8n/herald-private-ai-chat.json), keeping its Header Auth and Gemini credentials. The updated prompt allows answers from extracted file text. Push this code and let Vercel deploy.

This extraction sends college attachment contents to Gemini. Files remain in the private Supabase bucket; the app sends only capped text excerpts to chat. Ask AI and Documents will show extracted text only after the reader completes. Verify any important dates against the original file because OCR can misread scans.
