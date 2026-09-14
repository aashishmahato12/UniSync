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

Notices and events load from Supabase; calendar approval states are saved there. Payments use the Autumn 2026 batch schedule. You can mark each installment Due or Paid; those choices are saved in this browser only and are not college confirmations.

The payment form uploads a PDF/JPG/PNG receipt to private Supabase Storage and queues an email job only when `payment_receipt_settings.enabled` is true. The separate n8n workflow polls the queue, sends through Gmail, and updates the job status. The website shows that status; clicking Send first means **queued**, not delivered. The configured recipient is currently the owner's **test inbox**, so a test send is not a college submission. Follow the [receipt setup and test steps](./n8n/README.md) before using a real college address.

Documents now reads private college PDF/image attachments from Supabase after the [attachment migration and n8n workflow](./n8n/README.md) are applied. The notice modal links to its saved files and original Gmail message. Ask AI still uses sample behavior.
