# n8n first: Herald College email intake

The Gmail workflow is [**Herald College — Gmail notices to Supabase**](http://192.168.0.58:30109/workflow/YD0z3UNcTATTb0p1). The user reports that intake is working. The project reference is `qozetqmklegcnjgxtgpd`.

## What this first workflow does

1. Poll Gmail every five minutes for messages from any `@heraldcollege.edu.np` sender.
2. Fetch the full message, preserve its Gmail ID, and extract attachment names.
3. Ask Gemini for a concise notice summary, category, priority, and explicit event/deadline dates.
4. Validate the AI output. Dates without a clear day are excluded from event creation.
5. Upsert the notice into Supabase by Gmail message ID.
6. Insert event candidates with `Pending` calendar status. Reprocessing does not overwrite an event that was already `Added` or `Ignored`.

No Google Calendar event is created and no receipt email is sent by this workflow. Those will be separate, user-initiated workflows after the data flow is tested.

## Finish setup

1. In the existing Supabase project, run [001_college_core.sql](./001_college_core.sql) in SQL Editor.
2. In n8n, create an **HTTP Header Auth** credential with name `apikey` and value set to the Supabase **secret key**. Keep that key only in n8n. Do not put it in the website or this repository.
3. The **Save Notice** and **Save Pending Events** URLs already use your Supabase project. Select the HTTP Header Auth credential in both nodes.
4. **Gmail Trigger** searches `from:(@heraldcollege.edu.np)` every five minutes. **Prepare Email** also rejects senders whose address does not end in that exact domain.
5. Confirm the Gmail and Gemini credentials selected in **Gmail Trigger**, **Get Full Email**, and **Google Gemini Chat Model**.
6. Test with one non-sensitive sample message first. Inspect the notice and event rows in Supabase, especially dates and category. Only then publish the n8n workflow.

The importable file is [heritage-gmail-to-supabase.json](./heritage-gmail-to-supabase.json). The source snippets live alongside it; rerun `node n8n/build-workflow.mjs` from the app directory after changing them.

## Data and access

The owner-only access migration is in [002_single_owner_access.sql](./002_single_owner_access.sql) and has been applied according to the user. The secret key is for n8n only; the website uses a publishable key and the approved email's session. Gmail mail bodies are sent to the configured Gemini API for extraction; the database stores only the derived fields and Gmail source reference.

## Google Calendar approval sync

[Import the approval-sync workflow](./approved-events-to-google-calendar.json) as a **new, inactive** workflow in n8n. It checks Supabase every five minutes for events that the app marked `Added` but have no `google_calendar_event_id`. It creates a Google Calendar event on the connected account's primary calendar, then stores the Google event ID in Supabase.

1. In **List Approved Events** and **Save Google Event ID**, select the same Supabase HTTP Header Auth credential used in the Gmail workflow.
2. In **Create Google Calendar Event**, connect a Google Calendar OAuth2 credential for the account whose primary calendar should receive events. The workflow JSON contains no credentials.
3. Test with one approved event. Verify its date and time in Google Calendar, and verify that Supabase now has its `google_calendar_event_id`. Then activate the workflow.
4. If an event is already on the calendar but the database update failed, the workflow retries with the same deterministic Google ID. A duplicate response is treated as success.

Untimed events are all-day events in Asia/Kathmandu. Timed events use the extracted start and end; if no valid end exists, they last one hour. This workflow does not delete or edit a Google event after sync. The app therefore does not offer an undo action once an event is approved.

Run `node n8n/build-calendar-workflow.mjs` after changing the two calendar Code snippets, then run `node n8n/test-calendar-workflow.mjs`.

## References

- [Gmail Trigger](https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.gmailtrigger/)
- [Gmail Get Message](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.gmail/message-operations/)
- [n8n Supabase credentials](https://docs.n8n.io/integrations/builtin/credentials/supabase/)
- [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)
