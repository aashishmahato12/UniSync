# n8n first: Herald College email intake

The Gmail workflow is [**Herald College — Gmail notices to Supabase**](http://192.168.0.58:30109/workflow/YD0z3UNcTATTb0p1). The user reports that intake is working. The project reference is `qozetqmklegcnjgxtgpd`.

## What this first workflow does

1. Poll Gmail every five minutes for messages from any `@heraldcollege.edu.np` sender.
2. Fetch the full message, preserve its Gmail ID, and extract attachment names.
3. Ask Gemini for a concise notice summary, category, priority, and explicit event/deadline dates.
4. Validate the AI output. Dates without a clear day are excluded from event creation.
5. Upsert the notice into Supabase by Gmail message ID.
6. Insert event candidates with `Pending` calendar status. Reprocessing does not overwrite an event that was already `Added` or `Ignored`.

This intake workflow does not create calendar events or send receipt emails. Those functions use separate workflows.

## Finish setup

1. In the existing Supabase project, run [001_college_core.sql](./001_college_core.sql) in SQL Editor.
2. In n8n, create an **HTTP Header Auth** credential with name `apikey` and value set to the Supabase **secret key**. Keep that key only in n8n. Do not put it in the website or this repository.
3. The **Save Notice** and **Save Pending Events** URLs already use your Supabase project. Select the HTTP Header Auth credential in both nodes.
4. **Gmail Trigger** searches `from:(@heraldcollege.edu.np)` every five minutes. **Prepare Email** also rejects senders whose address does not end in that exact domain.
5. Confirm the Gmail and Gemini credentials selected in **Gmail Trigger**, **Get Full Email**, and **Google Gemini Chat Model**.
6. Test with one non-sensitive sample message first. Inspect the notice and event rows in Supabase, especially dates and category. Only then publish the n8n workflow.

The importable file is [heritage-gmail-to-supabase.json](./heritage-gmail-to-supabase.json). The source snippets live alongside it; rerun `node n8n/build-workflow.mjs` from the app directory after changing them.

## Backfill older Herald notices

The published Gmail trigger handles new mail. To import older messages into **Notices** and **Events**, import [herald-all-notices-backfill.json](./herald-all-notices-backfill.json) as a separate, manual workflow. Select the existing Gmail credential on **Get All Herald Emails** and **Get Full Email**, the existing Gemini credential on **Google Gemini Chat Model**, and the existing Supabase Header Auth credential on **Save Notice** and **Save Pending Events**. Run **Manual Backfill** once; do not publish this one-time workflow. It searches all `@heraldcollege.edu.np` senders, and Gmail **Return All** is enabled. It does not download attachment binaries because the separate attachment workflow stores those files.

If Gemini limits a large run, add Gmail date filters to the **Get All Herald Emails** search (for example `after:2026/08/01 before:2026/09/01`), then run each month. The notice upsert and event duplicate check make repeated windows safe. Review any failed execution before continuing. Rebuild this import file with `node n8n/build-notice-backfill.mjs` after changing the intake workflow.

## Data and access

The owner-only access migration is in [002_single_owner_access.sql](./002_single_owner_access.sql) and has been applied according to the user. The secret key is for n8n only; the website uses a publishable key and the approved email's session. Gmail mail bodies are sent to the configured Gemini API for extraction; the database stores only the derived fields and Gmail source reference.

## College notice attachments

Some college notices are PDF or image attachments with little or no email body. Apply [004_college_attachments.sql](./004_college_attachments.sql) to create a private file bucket and owner-only document rows. Then import [college-attachments-to-supabase.json](./college-attachments-to-supabase.json) as a **new, inactive** n8n workflow. Select the Gmail credential on its trigger and both Gmail Get nodes, and the Supabase secret-key HTTP credential on **Upload Private File** and **Save Document Row**. Keep secrets in n8n credentials, not in the JSON.

Use **Manual Backfill** to test up to 20 existing Herald emails with attachments. Check that a PDF or image reaches the private bucket, a matching row appears in `college_attachments`, and the file opens from Documents and its notice in UniSync. Then publish the new workflow to collect future attachments. It accepts PDFs, JPEGs and PNGs up to 10 MB, validates the sender domain again, and uses stable file paths so retries do not create duplicates.

The main Gmail notice workflow also needs its updated **Get Full Email** option (`Download Attachments` on), **Prepare Email** code, and **Validate Extraction** code from this repository. Test an attachment-only email before publishing that update. Such a notice is saved with an explicit “open the file” summary and no inferred events or deadlines; AI reading of PDF/image contents is a later step. The app never claims it read a file it has only stored.

Run `node n8n/build-attachment-workflow.mjs` and `node n8n/test-attachment-workflow.mjs` after editing the attachment workflow.

## Google Calendar approval sync

The [approval-sync workflow](http://192.168.0.58:30109/workflow/2mpPWZbKEfz6DMiD) is imported into n8n as an **inactive draft**. Its importable source is [here](./approved-events-to-google-calendar.json). It checks Supabase every five minutes for events that the app marked `Added` but have no `google_calendar_event_id`. It creates a Google Calendar event on the connected account's primary calendar, then stores the Google event ID in Supabase.

The existing Supabase Header Auth credential is selected in both database nodes, and the existing Google Calendar OAuth2 credential is selected in the create node. The workflow JSON contains no credentials.

1. Test with one known approved event. Verify its date and time in Google Calendar, and verify that Supabase now has its `google_calendar_event_id`. Then activate the workflow.
2. If an event is already on the calendar but the database update failed, the workflow retries with the same deterministic Google ID. A duplicate response is treated as success.

Untimed events are all-day events in Asia/Kathmandu. Timed events use the extracted start and end; if no valid end exists, they last one hour. This workflow does not delete or edit a Google event after sync. The app therefore does not offer an undo action once an event is approved.

Run `node n8n/build-calendar-workflow.mjs` after changing the two calendar Code snippets, then run `node n8n/test-calendar-workflow.mjs`.

## Payment receipt email

The separate [payment receipt workflow](https://catty-amino-bulldozer.ngrok-free.dev/workflow/7eFeBe0xlgu1jyEi) is published in n8n. Its project source is [payment-receipts-to-gmail.json](./payment-receipts-to-gmail.json). The website uploads receipts into a private Supabase bucket and queues jobs; n8n claims a job, downloads the file, sends it with Gmail, then records the Gmail message ID. A successful five-minute queue check alone does **not** prove an email was sent.

The workflow currently targets `aashishmahato8000@gmail.com`, confirmed as the owner's **test inbox**, not the college's receipt address. The app labels that destination as test mode when `recipient_label` matches it. Keep real payment proofs out of the test flow until the college's exact address is verified.

1. Run [003_payment_receipts.sql](./003_payment_receipts.sql) in the UniSync Supabase SQL Editor. It creates the private receipt bucket, owner-only queue, and claim function. The settings row starts disabled.
2. Confirm the live workflow's Supabase Header Auth and Gmail credentials are selected. The n8n URL is for managing the workflow; Vercel talks to Supabase and does not need to call the ngrok URL.
3. For a controlled test, set `payment_receipt_settings.recipient_label` to the test inbox and `enabled` to true in Supabase. Use a **non-sensitive sample receipt** in the app. Check the n8n execution past the Gmail node, the Gmail Sent folder, the test inbox, and the app's job status. Set `enabled` back to false if any step fails.
4. When the college gives its verified receipt address, change the recipient in the live **Prepare Receipt Email** node and in [prepare-receipt-email.js](./prepare-receipt-email.js), rebuild with `node n8n/build-receipt-workflow.mjs`, and update `recipient_label` to the same address. Publish the changed live workflow. Confirm with the college before sending a real receipt.

The importable JSON is intentionally inactive and contains no credentials; importing it over the live workflow would lose the existing credential selections. Run `node n8n/test-receipt-workflow.mjs` to validate the source and exported Code nodes. Avoid storing the Supabase secret key in this repository.

## References

- [Gmail Trigger](https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.gmailtrigger/)
- [Gmail Get Message](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.gmail/message-operations/)
- [n8n Supabase credentials](https://docs.n8n.io/integrations/builtin/credentials/supabase/)
- [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)
