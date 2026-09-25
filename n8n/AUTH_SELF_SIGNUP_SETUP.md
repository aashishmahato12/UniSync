# Private email sign-in setup

The app now supports verified users creating their own UniSync account. Before deploying the new sign-in screen, run [009_private_self_signup.sql](./009_private_self_signup.sql) in the Supabase SQL Editor. This is required: the current database still has a one-person allowlist and broad policies for that person's Gmail records.

Keep email sign-in and new user sign-up enabled in Supabase Authentication. The new account is created only after the person proves access to their email.

The migration assigns the existing college notices, calendar entries, and attachments to the original connected mailbox. New accounts can sign in and use their own uploads and custom calendar events, but their college inbox starts empty. The current n8n Gmail intake and outgoing email credential stay with the original account. Connect and scope a separate intake and sender before enabling those features for another user.

To make the six-digit CodeSlots field usable, edit **Supabase → Authentication → Email Templates → Magic link / OTP** and include the OTP variable in the email body:

```html
<p>Your UniSync sign-in code is: <strong>{{ .Token }}</strong></p>
<p>Or sign in with this link: <a href="{{ .ConfirmationURL }}">Open UniSync</a></p>
```

Keeping the link gives existing users a working fallback. The app verifies the code with Supabase using the email and OTP; it never stores the code. If your Supabase project has an inactivity timeout or a session time-box configured, review those settings under **Authentication → Sessions**. The frontend persists and refreshes sessions, but cannot override a server-enforced timeout.

Check one original account and one new account after applying the migration. The new account should see none of the original account's college notices, events, or attachments. Each user's uploaded files and custom events should remain private after signing out and switching accounts.
