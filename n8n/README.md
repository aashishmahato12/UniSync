# n8n first: Herald College email intake

The draft workflow has been imported into n8n as [**Herald College — Gmail notices to Supabase**](http://192.168.0.58:30109/workflow/YD0z3UNcTATTb0p1). It is deliberately unpublished until the database tables, Supabase credential, and a test run are complete. The project reference is `qozetqmklegcnjgxtgpd`.

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

The SQL enables Row Level Security with no public policies, so the website cannot yet read these records. The secret key is for n8n only. When student sign-in is added, create user-scoped policies before connecting the website. Gmail mail bodies are sent to the configured Gemini API for extraction; the database stores only the derived fields and Gmail source reference.

## References

- [Gmail Trigger](https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.gmailtrigger/)
- [Gmail Get Message](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.gmail/message-operations/)
- [n8n Supabase credentials](https://docs.n8n.io/integrations/builtin/credentials/supabase/)
- [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)
