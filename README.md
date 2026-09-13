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

## Demo behavior and future integration

Notices and events load from Supabase; calendar approval states are saved there. Payments, documents, and Ask AI still use sample data through `src/services/mockService.ts`. The **Send receipt** button records a mock submission and does **not** email the college. Document and notice source links show previews until mail and file storage are connected.

To connect a backend, replace the functions in `src/services/mockService.ts` with authenticated Supabase queries or n8n webhook calls. Store uploaded receipts securely, use an authorized sender address for email, and update payment status only after the send operation succeeds. An n8n workflow can ingest college mail, classify notices, extract event candidates, and write them to the service; the UI already supports pending calendar approvals.
