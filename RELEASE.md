# Shipping Habito

Everything Habito stores lives on the device in a single SQLite file. There is
no account, no server and no analytics, which keeps the release paperwork short
— but it also means an uninstall is permanent for the user. Say so in the
listing rather than letting them find out.

## Before every build

```bash
npm run typecheck && npm test
```

Then drive the app on a real device. The web target is useful for a quick look,
but `expo-sqlite` uses a different backend there, so **cold-start persistence
must be checked on device**:

1. Finish onboarding, force-quit, reopen — onboarding must not reappear.
2. Check a habit off, force-quit, reopen — the tick must still be there.
3. Move the device clock forward a day — Today resets, the heatmap keeps
   yesterday, and the streak survives.
4. Set a reminder a couple of minutes out and confirm the notification fires.

## Versioning

`app.json` holds `version` (user-facing), `ios.buildNumber` and
`android.versionCode`. The production EAS profile has `autoIncrement`, so the
build numbers look after themselves; bump `version` by hand for a release.

`runtimeVersion` follows `appVersion`, which means an OTA update only reaches
builds of the same version. Any change that touches native code — adding a
config plugin, bumping the Expo SDK, adding the widget target — needs a new
store build, not an update.

## Builds

```bash
npx eas build --profile preview --platform ios       # simulator build
npx eas build --profile production --platform all    # store build
```

`preview` produces something installable internally; `production` is what gets
submitted.

## Store submission

Both stores will ask about data collection. The honest answer is the short one:
Habito collects nothing, transmits nothing, and uses no third-party SDKs. On
iOS that is "Data Not Collected" in App Privacy. On Google Play, the Data Safety
form is all "No".

The one permission the app requests is notifications, and only at the moment a
reminder is first scheduled — not at launch.

Still to be written, and not something the code can supply:

- [ ] Store screenshots (6.7" and 6.5" iPhone, plus Android phone)
- [ ] Description and keywords
- [ ] Privacy policy URL — required by both stores even when nothing is
      collected. A single page stating that is enough.
- [ ] Support URL
- [ ] Apple Developer and Google Play Console accounts

## Known gaps

- **Widgets are prepared but not built.** `src/lib/widget.ts` produces the exact
  payload a widget needs and the store calls it after every mutation. Adding the
  native target means `npx expo prebuild`, an App Group entitlement
  (`group.com.habito.app`) on both the app and the widget, and changing where
  `writeWidgetSnapshot` sends its output. Nothing above that function changes.
- **"Share recap" and "Share this"** use the system share sheet with plain text.
  An image export would be better and is not built.
- **The milestone screen has an empty art slot** where the design called for a
  3D render.
- **No import or export.** Erasing data is available on the You screen; getting
  it back out is not.
