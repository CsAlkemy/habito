import { useSQLiteContext } from 'expo-sqlite';
import { useRouter } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useStore } from './store';
import type { ReminderSoundId } from './types';
import type { WidgetStyle } from '@/lib/widget';
import { loadSettings, saveSetting } from '@/db/repo';
import {
  type Plan,
  type PlanId,
  purchase as storePurchase,
  readEntitlement,
  onEntitlementChange,
  restore as storeRestore,
  STORE_LIVE,
  type StoreSnapshot,
} from '@/lib/purchases';

/**
 * What stays free and what Pro unlocks. Kept in one place so the paywall's
 * feature list and the gates themselves can't drift apart.
 *
 * The free tier is meant to be a real habit tracker, not a demo: three habits
 * with reminders, streaks, the month view and export are enough to build the
 * habit of opening the app. Pro is depth and personalisation on top. Nothing a
 * user already has is ever taken away — the habit limit only stops *adding*,
 * and a lapsed subscriber keeps every habit and check-in they made.
 */
export const FREE_HABIT_LIMIT = 3;
export const FREE_SOUNDS: ReminderSoundId[] = ['default', 'chime'];
export const FREE_WIDGET_STYLES: WidgetStyle[] = ['list'];
/**
 * The home-screen widget has no native target yet (see RELEASE.md), so its
 * styles can't be sold: the gate and the perk stay dormant until it ships.
 */
export const WIDGETS_LIVE = false;
/** Progress ranges past this many weeks are Pro. */
export const FREE_RANGE_WEEKS = 5;

/** Why the paywall opened; picks its headline. */
export type ProFeature = 'habits' | 'history' | 'widget' | 'sounds' | 'accent' | 'general';

const ALL_PERKS: { feature: ProFeature; title: string; sub: string }[] = [
  { feature: 'habits', title: 'Unlimited habits', sub: `Free keeps you to ${FREE_HABIT_LIMIT}` },
  { feature: 'history', title: 'Six months and a year of progress', sub: 'See the long view on every chart' },
  { feature: 'widget', title: 'Every widget style', sub: 'Progress ring and streak card' },
  { feature: 'sounds', title: 'All reminder tones', sub: 'Bloom, Drop, Pulse and every new one' },
  { feature: 'accent', title: 'Any accent colour', sub: 'Pick exactly the shade you like' },
];

export const PRO_PERKS = ALL_PERKS.filter((p) => WIDGETS_LIVE || p.feature !== 'widget');

export const PRO_HEADLINES: Record<ProFeature, string> = {
  habits: 'Track as many habits as you want',
  history: 'See how far you’ve come',
  widget: 'Put your streak on the home screen',
  sounds: 'Reminders that sound like you',
  accent: 'Make it yours',
  general: 'Habito Pro',
};

const KEY_PRO = 'pro.active';
const KEY_PLAN = 'pro.plan';

type ProState = {
  isPro: boolean;
  /** which plan is active, when the store can tell */
  planId: PlanId | null;
  /** the store's subscription page; null for lifetime or preview */
  manageUrl: string | null;
  /** true when purchases reach a real store; false in preview */
  live: boolean;
  purchase: (plan: Plan) => Promise<'purchased' | 'cancelled'>;
  restore: () => Promise<boolean>;
  /** Debug builds in preview only: drop the locally granted Pro. */
  resetPreview?: () => void;
};

const ProContext = createContext<ProState | null>(null);

export function ProProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const [isPro, setIsPro] = useState(false);
  const [planId, setPlanId] = useState<PlanId | null>(null);
  const [manageUrl, setManageUrl] = useState<string | null>(null);

  const apply = useCallback(
    (snap: StoreSnapshot) => {
      setIsPro(snap.pro);
      setPlanId(snap.planId);
      setManageUrl(snap.manageUrl);
      // Cached so a cold start offline doesn't flash the locks at a subscriber.
      Promise.all([
        saveSetting(db, KEY_PRO, snap.pro ? '1' : '0'),
        saveSetting(db, KEY_PLAN, snap.planId ?? ''),
      ]).catch((err) => console.error('[habito] save pro state failed', err));
    },
    [db],
  );

  useEffect(() => {
    let cancelled = false;
    loadSettings(db)
      .then((settings) => {
        if (cancelled) return;
        setIsPro(settings[KEY_PRO] === '1');
        setPlanId((settings[KEY_PLAN] as PlanId) || null);
      })
      .catch(() => {});
    // The store is the authority; the cache only covers the gap until it answers.
    readEntitlement()
      .then((snap) => !cancelled && snap && apply(snap))
      .catch((err) => console.warn('[habito] entitlement check failed', err));
    const unsubscribe = onEntitlementChange(apply);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [db, apply]);

  const purchase = useCallback<ProState['purchase']>(
    async (plan) => {
      if (!STORE_LIVE) {
        if (!__DEV__) {
          throw new Error('Purchases aren’t available in this build.');
        }
        apply({ pro: true, planId: plan.id, manageUrl: null });
        return 'purchased';
      }
      const result = await storePurchase(plan);
      if (result.status === 'purchased') apply(result.snap);
      return result.status;
    },
    [apply],
  );

  const restore = useCallback<ProState['restore']>(async () => {
    const snap = await storeRestore();
    apply(snap);
    return snap.pro;
  }, [apply]);

  const resetPreview = useCallback(
    () => apply({ pro: false, planId: null, manageUrl: null }),
    [apply],
  );

  const value = useMemo<ProState>(
    () => ({
      isPro,
      planId,
      manageUrl,
      live: STORE_LIVE,
      purchase,
      restore,
      resetPreview: !STORE_LIVE && __DEV__ ? resetPreview : undefined,
    }),
    [isPro, planId, manageUrl, purchase, restore, resetPreview],
  );

  return <ProContext.Provider value={value}>{children}</ProContext.Provider>;
}

export function usePro() {
  const ctx = useContext(ProContext);
  if (!ctx) throw new Error('usePro must be used inside <ProProvider>');
  return ctx;
}

/** True when a free user has used every habit slot. */
export function useAtHabitLimit() {
  const { isPro } = usePro();
  const { habits } = useStore();
  return !isPro && habits.length >= FREE_HABIT_LIMIT;
}

/** Every "add a habit" affordance goes through this, so none skips the limit. */
export function useAddHabit() {
  const router = useRouter();
  const atLimit = useAtHabitLimit();
  const openPaywall = useOpenPaywall();
  return useCallback(
    () => (atLimit ? openPaywall('habits') : router.push('/habit/new')),
    [atLimit, openPaywall, router],
  );
}

/** Opens the paywall, headlined for the feature that was reached for. */
export function useOpenPaywall() {
  const router = useRouter();
  return useCallback(
    (feature: ProFeature = 'general') =>
      router.push({ pathname: '/paywall', params: { feature } }),
    [router],
  );
}
