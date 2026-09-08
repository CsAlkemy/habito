# Habito

Expo + React Native implementation of the **Habit Tracker — Screens** Claude Design
project ([`ab1cea61`](https://claude.ai/design/p/ab1cea61-963e-428b-98b3-57ba6e09b829)),
milestone 2 — the dark rebuild.

```bash
npm start
```

Then press `i` for the iOS simulator, `a` for Android, or scan the QR code with
Expo Go. Everything used here (SVG, gradients, haptics) ships inside Expo Go, so
no custom dev client is needed.

## Screen map

Each design option maps to one route.

| Design | Screen | Route |
| --- | --- | --- |
| 2a | Guided setup, step 2 of 3 | `app/onboarding.tsx` |
| 2b | Today · home | `app/(tabs)/index.tsx` |
| 2c | Check-in sheet · numeric habit | `app/check-in/[id].tsx` |
| 2d | Skip · no judgement | `app/skip/[id].tsx` |
| 2e | New habit · milestone type | `app/habit/new.tsx` |
| 2f | Habit detail · streak, heatmap, weeks | `app/habit/[id].tsx` |
| 2g | Milestone reached | `app/milestone.tsx` |
| 2h | Weekly recap · Sunday | `app/recap.tsx` |
| 2i | Progress overview · all habits | `app/(tabs)/progress.tsx` |
| 2j | Lock screen · reminder, live activity, widget | `app/lock-screen.tsx` |
| 2k | You · level, badges, notification budget | `app/(tabs)/you.tsx` |

Routes that aren't tabs are reached the way the product implies: tap a habit to
check in, long-press to skip, tap the milestone banner for the habit detail. The
weekly recap and lock-screen preview open from the matching rows in **You →
Notifications**.

## Layout

```
app/                 routes (expo-router, file-based)
src/theme/           tokens.ts, text.ts, color.ts — the design system
src/components/      shared surfaces: AccentTile, Card, Heatmap, Charts, …
src/data/            types, seed data, and the in-memory store
src/lib/             date and copy formatting
```

### Theme

`src/theme/tokens.ts` is the single source of colour, radius, shadow and
gradient. The design doc exposes one `accent` prop; here that is the `ACCENT`
constant at the top of the file, and everything tinted derives from it. The
gradient stops are hand-picked for the default cyan, so a different accent wants
matching stops.

`src/theme/color.ts` reimplements CSS `color-mix(in srgb, …)`, which the design
uses to build the heatmap ramp and the mid-tone chart bars.

### State

`src/data/store.tsx` is a React context holding habits, today's entries and the
notification settings. It is **in-memory only** — restarting the app resets it.
Every screen reads through `useStore` / `useHabit` / `useTodayProgress`, so
swapping in `expo-sqlite` + Drizzle (or AsyncStorage) touches only that file.

Marking a habit done bumps its streak and returns the milestone rung it hit, if
any, which is what routes you to screen 2g. Skipping deliberately leaves the
streak alone — screen 2d promises exactly that.

## Known gaps

- **2j is a preview, not the real thing.** A lock-screen reminder, a Live
  Activity and a home-screen widget are OS surfaces React Native cannot render.
  Shipping them needs `expo-notifications` for the reminder, ActivityKit for the
  Live Activity, and WidgetKit / Jetpack Glance targets for the widgets. The
  screen is the visual reference for building those.
- **The 3D milestone render is missing.** The design's `<image-slot>` was empty,
  so `app/milestone.tsx` draws the same dashed placeholder. Pass a `source` to
  `<ImageSlot>` once the art exists.
- **No persistence, no notification scheduling, no auth or sync.**
- The design's own numbers disagree in a couple of places (2b shows Morning run
  at a 6-day streak, 2f shows 5; 2d quotes a 12-day streak for a habit listed at
  0 in 2b). The app renders live state from one model rather than reproducing
  both.
