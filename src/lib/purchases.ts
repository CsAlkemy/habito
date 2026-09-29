import { Platform } from 'react-native';
import type { CustomerInfo, PurchasesPackage } from 'react-native-purchases';

/**
 * The only file that talks to the store.
 *
 * Purchases go through RevenueCat, which wraps StoreKit and Play Billing and
 * keeps the receipt validation off this device-only app's plate. Everything
 * Pro hangs off one entitlement, so a plan can be added, repriced or retired in
 * the RevenueCat dashboard without an app release.
 *
 * Keys come from `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `..._ANDROID_KEY` (see
 * `.env.example`). Without one — a fresh clone, or the web target — the store
 * runs in preview: the paywall shows the list prices below and, in a debug
 * build only, "buying" unlocks Pro locally so the gates can be exercised.
 * Expo Go with a key gets RevenueCat's own Preview API mode, which mocks the
 * native calls the same way.
 */

export const ENTITLEMENT = 'pro';

export type PlanId = 'annual' | 'monthly' | 'lifetime';

export type Plan = {
  id: PlanId;
  title: string;
  /** '$19.99' — localised by the store when it is live */
  price: string;
  /** '/ year', '/ month', 'once' */
  period: string;
  /** a line under the price: per-month equivalent, trial, or 'pay once' */
  note?: string;
  /** the corner flag on the recommended plan */
  flag?: string;
  /** 7 for a 7-day free trial; undefined when there is none */
  trialDays?: number;
  /** the store's package; absent in preview */
  pkg?: PurchasesPackage;
};

/**
 * List prices, used in preview and as the order the paywall draws in.
 *
 * Why these: monthly at $2.99 is the entry point people compare against; the
 * yearly plan is priced to be the obvious pick (44% off, and carries the trial,
 * which is where most habit-app revenue comes from); lifetime exists because a
 * privacy-first, no-server app attracts people who dislike subscriptions, and
 * at ~13 months of the monthly plan it doesn't undercut the yearly one.
 */
const LIST: Record<PlanId, { title: string; price: number; period: string; trialDays?: number }> = {
  annual: { title: 'Yearly', price: 19.99, period: '/ year', trialDays: 7 },
  monthly: { title: 'Monthly', price: 2.99, period: '/ month' },
  lifetime: { title: 'Lifetime', price: 39.99, period: 'once' },
};

const ORDER: PlanId[] = ['annual', 'monthly', 'lifetime'];

const dollars = (n: number) => `$${n.toFixed(2)}`;

function savingFlag(monthly: number, annual: number): string | undefined {
  if (!(monthly > 0) || !(annual > 0)) return undefined;
  const pct = Math.round((1 - annual / (monthly * 12)) * 100);
  return pct > 0 ? `Save ${pct}%` : undefined;
}

function annualNote(perMonth: string, trialDays?: number): string {
  return trialDays ? `${trialDays} days free, then ${perMonth}/mo` : `Just ${perMonth}/mo`;
}

function previewPlans(): Plan[] {
  const flag = savingFlag(LIST.monthly.price, LIST.annual.price);
  return ORDER.map((id) => {
    const list = LIST[id];
    return {
      id,
      title: list.title,
      price: dollars(list.price),
      period: list.period,
      trialDays: list.trialDays,
      flag: id === 'annual' ? flag : undefined,
      note:
        id === 'annual'
          ? annualNote(dollars(list.price / 12), list.trialDays)
          : id === 'lifetime'
            ? 'Pay once, yours for good'
            : 'Cancel anytime',
    };
  });
}

/** Days in a free intro offer, or undefined when the intro isn't free. */
function freeTrialDays(pkg: PurchasesPackage): number | undefined {
  const intro = pkg.product.introPrice;
  if (!intro || intro.price !== 0) return undefined;
  const per = { DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365 }[intro.periodUnit] ?? 0;
  return per * intro.periodNumberOfUnits * Math.max(1, intro.cycles) || undefined;
}

function storePlans(packages: PurchasesPackage[]): Plan[] {
  const byId: Partial<Record<PlanId, PurchasesPackage>> = {};
  for (const pkg of packages) {
    if (pkg.packageType === 'ANNUAL') byId.annual = pkg;
    else if (pkg.packageType === 'MONTHLY') byId.monthly = pkg;
    else if (pkg.packageType === 'LIFETIME') byId.lifetime = pkg;
  }
  const flag =
    byId.monthly && byId.annual
      ? savingFlag(byId.monthly.product.price, byId.annual.product.price)
      : undefined;
  return ORDER.flatMap((id) => {
    const pkg = byId[id];
    if (!pkg) return [];
    const trialDays = freeTrialDays(pkg);
    const perMonth =
      pkg.product.pricePerMonthString ??
      `${pkg.product.currencyCode} ${(pkg.product.price / 12).toFixed(2)}`;
    return [
      {
        id,
        title: LIST[id].title,
        price: pkg.product.priceString,
        period: LIST[id].period,
        trialDays,
        flag: id === 'annual' ? flag : undefined,
        note:
          id === 'annual'
            ? annualNote(perMonth, trialDays)
            : id === 'lifetime'
              ? 'Pay once, yours for good'
              : 'Cancel anytime',
        pkg,
      },
    ];
  });
}

const API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
});

/** True when purchases go to a real (or RevenueCat-mocked) store. */
export const STORE_LIVE = Platform.OS !== 'web' && !!API_KEY;

/**
 * Loaded lazily so the web bundle and key-less builds never touch the native
 * module; `configure` must run before any other call.
 */
const Purchases = STORE_LIVE
  ? (require('react-native-purchases').default as typeof import('react-native-purchases').default)
  : null;

let configured = false;
function store() {
  if (!Purchases) return null;
  if (!configured) {
    Purchases.configure({ apiKey: API_KEY! });
    configured = true;
  }
  return Purchases;
}

export const hasPro = (info: CustomerInfo) => ENTITLEMENT in info.entitlements.active;

export type StoreSnapshot = { pro: boolean; manageUrl: string | null; planId: PlanId | null };

function snapshot(info: CustomerInfo): StoreSnapshot {
  const active = info.entitlements.active[ENTITLEMENT];
  const productId = active?.productIdentifier ?? '';
  const planId: PlanId | null = !active
    ? null
    : active.periodType === 'TRIAL' || /year|annual/i.test(productId)
      ? 'annual'
      : /month/i.test(productId)
        ? 'monthly'
        : 'lifetime';
  return { pro: !!active, manageUrl: info.managementURL, planId };
}

/** Current entitlement, or null in preview or when the store can't be reached. */
export async function readEntitlement(): Promise<StoreSnapshot | null> {
  const s = store();
  if (!s) return null;
  return snapshot(await s.getCustomerInfo());
}

/** Renewals, refunds and purchases made on another device arrive here. */
export function onEntitlementChange(cb: (snap: StoreSnapshot) => void): () => void {
  const s = store();
  if (!s) return () => {};
  const listener = (info: CustomerInfo) => cb(snapshot(info));
  s.addCustomerInfoUpdateListener(listener);
  return () => {
    s.removeCustomerInfoUpdateListener(listener);
  };
}

export async function loadPlans(): Promise<Plan[]> {
  const s = store();
  if (!s) return previewPlans();
  const offerings = await s.getOfferings();
  const plans = storePlans(offerings.current?.availablePackages ?? []);
  // An offering that isn't set up yet shouldn't leave the paywall empty; the
  // buttons stay disabled because the plans have no package behind them.
  return plans.length > 0 ? plans : previewPlans();
}

export type PurchaseResult = { status: 'purchased'; snap: StoreSnapshot } | { status: 'cancelled' };

export async function purchase(plan: Plan): Promise<PurchaseResult> {
  const s = store();
  if (!s || !plan.pkg) {
    throw new Error('The App Store isn’t reachable right now. Try again in a moment.');
  }
  try {
    const { customerInfo } = await s.purchasePackage(plan.pkg);
    return { status: 'purchased', snap: snapshot(customerInfo) };
  } catch (err) {
    if ((err as { userCancelled?: boolean }).userCancelled) return { status: 'cancelled' };
    throw err;
  }
}

export async function restore(): Promise<StoreSnapshot> {
  const s = store();
  if (!s) throw new Error('Restoring needs the App Store, which isn’t available here.');
  return snapshot(await s.restorePurchases());
}
