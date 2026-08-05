# Privacy Policy — Orbit

_Last updated: August 4, 2026_

Orbit is a private, offline dating journal. This policy explains what the app
does and does not do with your information, in plain language.

## The short version

Everything you enter into Orbit — people, dates, ratings, notes — stays on
your device. Orbit has no account system, no server, and no company on the
other end collecting or receiving any of it. There is nothing to leak,
because nothing is ever sent anywhere.

## What Orbit stores, and where

Orbit stores data locally, in an encrypted database on your device:

- **People** you add: their name, where you met, your private notes about them.
- **Dates** you log: the activity, your ratings, notes, and the resulting score.
- **Settings**: your preferences (goal, reminders, language, privacy toggles).

Names, notes, and your date answers are encrypted at rest (AES-256) before
they touch the database file. The encryption key lives in your device's
secure hardware-backed keystore (iOS Keychain / Android Keystore) — the same
system your device uses to protect passwords and payment credentials — and
never leaves the device.

None of this is backed up to a server we control, because there is no such
server. If you use your device's own backup system (iCloud Backup, Google
Backup), that backup is between you and Apple/Google, governed by their
policies — Orbit has no part in it.

## Passcode and Face ID

If you turn on Orbit's passcode lock, the code you set is stored locally in
the same secure keystore, never in plain text and never transmitted anywhere.
Face ID / fingerprint unlock is handled entirely by your device's operating
system — Orbit never receives or stores any biometric data itself; it only
receives a yes/no result from the OS.

If you forget your passcode, there is no way for us to reset it remotely
(there is no "us" to ask — Orbit has no account or server to verify your
identity against). The only recovery option is to erase and start over,
which permanently deletes the on-device journal. This is explained again at
the point where you'd use it.

## Notifications

If you turn on reminders (post-date nudge, weekly reflection), Orbit
schedules ordinary local notifications directly on your device. These are
not push notifications — no token is generated, no notification content is
ever sent to or through a server.

## Exporting your data

Settings includes an "Export my data" option. This writes an unencrypted
copy of your journal to a file that you choose where to save or share — the
export only happens when you explicitly ask for it, and what you do with the
resulting file afterward (delete it, keep it, share it) is entirely up to
you.

## What Orbit does not do

- No account creation, no sign-in, no email collection.
- No analytics, no crash-reporting SDKs, no advertising, no tracking of any kind.
- No data is sold, shared, or transmitted to any third party, ever.
- No location tracking.

## Deleting your data

Uninstalling Orbit removes the on-device database along with it. Inside the
app, Settings → "Reset to empty state" does the same thing without
uninstalling — both are permanent and cannot be undone, for the same reason
described above: there's no server copy to fall back on.

## Age

Orbit is intended for adults using it to reflect on their own dating life.
It is not directed at children, and does not knowingly collect any
information from children, because it does not collect information from
anyone — everything stays on the device it was entered on.

## Changes to this policy

If this policy changes, the "Last updated" date at the top will change with
it. Material changes will be reflected in the app's release notes.

## Contact

Questions about this policy or how Orbit handles data can be sent to:

**konstantin.hordx@gmail.com**
