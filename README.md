# Herald College Student Assistant

A responsive React demo for college notices, events, a monthly calendar, payment receipts, documents, and a student AI assistant.

The first backend workflow is drafted in n8n. See the [n8n setup guide](./n8n/README.md) for the Gmail-to-Supabase intake flow and the remaining connection steps.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To verify the production bundle, run `npm run build` and then `npm run preview`.

## Demo behavior and future integration

All initial records are realistic sample data in `src/data.ts`. The interface uses `src/services/mockService.ts` as its API boundary. Calendar changes, receipt submission, document additions, and preference changes are demo interactions; they are not persisted across reloads. The **Send receipt** button records a mock submission and does **not** email the college. Document and notice source links show previews until mail and file storage are connected.

To connect a backend, replace the functions in `src/services/mockService.ts` with authenticated Supabase queries or n8n webhook calls. Store uploaded receipts securely, use an authorized sender address for email, and update payment status only after the send operation succeeds. An n8n workflow can ingest college mail, classify notices, extract event candidates, and write them to the service; the UI already supports pending calendar approvals.
