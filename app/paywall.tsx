import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Button, TextAction } from '@/components/Button';
import { BellIcon, DropIcon, InfinityIcon, TrendIcon, WidgetIcon } from '@/components/Icons';
import { RadialBackdrop } from '@/components/RadialBackdrop';
import { Screen } from '@/components/Screen';
import { PRO_HEADLINES, PRO_PERKS, type ProFeature, usePro } from '@/data/pro';
import { loadPlans, type Plan, type PlanId } from '@/lib/purchases';
import { mix } from '@/theme/color';
import { themedStyles, useTheme } from '@/theme';
import { font, radius, tracking } from '@/theme/tokens';

/** Apple's standard licence; swap for your own terms if you publish some. */
const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL;

const PERK_ICONS: Record<Exclude<ProFeature, 'general'>, typeof BellIcon> = {
  habits: InfinityIcon,
  history: TrendIcon,
  widget: WidgetIcon,
  sounds: BellIcon,
  accent: DropIcon,
};

const FEATURES = new Set<string>(PRO_PERKS.map((p) => p.feature).concat('general'));

function ctaLabel(plan: Plan | undefined): string {
  if (!plan) return 'Continue';
  if (plan.trialDays) return `Start ${plan.trialDays}-day free trial`;
  if (plan.id === 'lifetime') return `Unlock for ${plan.price}`;
  return `Subscribe for ${plan.price}${plan.period.replace('/ ', '/')}`;
}

function fineprint(plan: Plan | undefined): string {
  if (!plan) return '';
  if (plan.id === 'lifetime') return 'One payment. No subscription, no renewals.';
  const store = Platform.OS === 'android' ? 'Google Play' : 'your Apple ID';
  const trial = plan.trialDays
    ? `Free for ${plan.trialDays} days, then ${plan.price}${plan.period.replace('/ ', '/')}. `
    : '';
  return (
    `${trial}Charged to ${store}. Renews automatically unless cancelled at least 24 hours ` +
    'before the period ends. Manage or cancel anytime in your account settings.'
  );
}

/**
 * The paywall. Opened from any gate with `?feature=` so the headline speaks to
 * what the person just reached for, and that perk leads the list.
 */
export default function Paywall() {
  const router = useRouter();
  const params = useLocalSearchParams<{ feature?: string }>();
  const feature: ProFeature = FEATURES.has(params.feature ?? '')
    ? (params.feature as ProFeature)
    : 'general';
  const { isPro, live, purchase, restore } = usePro();
  const { text, colors } = useTheme();
  const styles = useStyles();

  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [selected, setSelected] = useState<PlanId>('annual');
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadPlans()
      .then((loaded) => {
        if (cancelled) return;
        setPlans(loaded);
        if (!loaded.some((p) => p.id === 'annual') && loaded[0]) setSelected(loaded[0].id);
      })
      .catch((err) => {
        console.warn('[habito] offerings failed', err);
        if (!cancelled) setPlans([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const perks = useMemo(
    () => [...PRO_PERKS].sort((a, b) => Number(b.feature === feature) - Number(a.feature === feature)),
    [feature],
  );
  const plan = plans?.find((p) => p.id === selected);
  // Live: only plans the store returned. Preview: debug builds only.
  const purchasable = !!plan && (live ? plan.pkg !== undefined : __DEV__);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  const onBuy = async () => {
    if (!plan || busy) return;
    setBusy('buy');
    try {
      const result = await purchase(plan);
      if (result === 'purchased') close();
    } catch (err) {
      Alert.alert('Purchase didn’t go through', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const onRestore = async () => {
    if (busy) return;
    setBusy('restore');
    try {
      const restored = await restore();
      if (restored) close();
      else Alert.alert('Nothing to restore', 'No Habito Pro purchase was found for this account.');
    } catch (err) {
      Alert.alert('Restore failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen gutter background={colors.groundDeep} bottomExtra={24}>
      <RadialBackdrop
        stops={[mix(34, colors.groundDeep, colors.accent), colors.ground, colors.groundDeep]}
        cy="0.05"
        rx="1.3"
        ry="0.7"
        midpoint={0.5}
      />

      <View style={styles.top}>
        <TextAction label="Not now" onPress={close} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <Text style={text.eyebrow}>Habito Pro</Text>
        <Text style={[text.screenTitleLg, styles.headline]}>{PRO_HEADLINES[feature]}</Text>

        <View style={styles.perks}>
          {perks.map((perk) => {
            const Icon = PERK_ICONS[perk.feature as keyof typeof PERK_ICONS];
            const lead = perk.feature === feature;
            return (
              <View key={perk.feature} style={styles.perk}>
                <View style={[styles.perkGlyph, lead && styles.perkGlyphLead]}>
                  <Icon size={20} color={lead ? colors.accentInk : colors.accentText} />
                </View>
                <View style={styles.perkText}>
                  <Text style={styles.perkTitle}>{perk.title}</Text>
                  <Text style={styles.perkSub}>{perk.sub}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {isPro ? (
          <View style={styles.owned}>
            <Text style={styles.ownedTitle}>You’re on Pro</Text>
            <Text style={styles.ownedSub}>Everything above is unlocked. Thanks for backing Habito.</Text>
          </View>
        ) : plans === null ? (
          <ActivityIndicator style={styles.loading} color={colors.accent} />
        ) : (
          <View style={styles.plans} accessibilityRole="radiogroup">
            {plans.map((option) => {
              const active = option.id === selected;
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active, checked: active }}
                  accessibilityLabel={`${option.title}, ${option.price} ${option.period}. ${option.note ?? ''}`}
                  onPress={() => setSelected(option.id)}
                  style={({ pressed }) => [
                    styles.plan,
                    active && { borderColor: colors.accent },
                    pressed && styles.pressed,
                  ]}
                >
                  {option.flag && (
                    <View style={styles.flag}>
                      <Text style={styles.flagText}>{option.flag}</Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.radio,
                      active
                        ? { borderColor: colors.accent, backgroundColor: colors.accent }
                        : { borderColor: colors.ringAlt },
                    ]}
                  >
                    {active && <View style={[styles.radioDot, { backgroundColor: colors.accentInk }]} />}
                  </View>
                  <View style={styles.planText}>
                    <Text style={styles.planTitle}>{option.title}</Text>
                    {option.note && <Text style={styles.planNote}>{option.note}</Text>}
                  </View>
                  <View style={styles.planPrice}>
                    <Text style={styles.planAmount}>{option.price}</Text>
                    <Text style={styles.planPeriod}>{option.period}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {!isPro && (
        <View style={styles.footer}>
          <View style={styles.ctaRow}>
            <Button
              label={busy === 'buy' ? 'One moment…' : ctaLabel(plan)}
              onPress={onBuy}
              disabled={!purchasable || busy !== null}
            />
          </View>
          <Text style={styles.fineprint}>
            {!live && __DEV__ ? 'Preview: no store key set, so nothing is charged. ' : ''}
            {fineprint(plan)}
          </Text>
          <View style={styles.links}>
            <TextAction
              label={busy === 'restore' ? 'Restoring…' : 'Restore purchases'}
              onPress={onRestore}
              labelStyle={styles.link}
            />
            <TextAction label="Terms" onPress={() => Linking.openURL(TERMS_URL)} labelStyle={styles.link} />
            {PRIVACY_URL && (
              <TextAction
                label="Privacy"
                onPress={() => Linking.openURL(PRIVACY_URL)}
                labelStyle={styles.link}
              />
            )}
          </View>
        </View>
      )}
    </Screen>
  );
}

const useStyles = themedStyles(({ colors }) => ({
  top: {
    alignItems: 'flex-end' as const,
  },
  body: {
    paddingTop: 18,
    paddingBottom: 12,
  },
  headline: {
    marginTop: 10,
  },
  perks: {
    marginTop: 22,
    gap: 14,
  },
  perk: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 14,
  },
  perkGlyph: {
    width: 36,
    height: 36,
    borderRadius: radius.tile,
    backgroundColor: colors.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  perkGlyphLead: {
    backgroundColor: colors.accent,
  },
  perkText: {
    flex: 1,
  },
  perkTitle: {
    fontFamily: font.semibold,
    fontSize: 14.5,
    lineHeight: 18,
    color: colors.text,
  },
  perkSub: {
    marginTop: 2,
    fontFamily: font.regular,
    fontSize: 12.5,
    lineHeight: 16,
    color: colors.textSub,
  },
  loading: {
    marginTop: 40,
  },
  plans: {
    marginTop: 26,
    gap: 10,
  },
  plan: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 14,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.8,
  },
  flag: {
    position: 'absolute' as const,
    top: -9,
    right: 16,
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  flagText: {
    fontFamily: font.semibold,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: tracking(0.1, 10),
    color: colors.accentInk,
    textTransform: 'uppercase' as const,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  planText: {
    flex: 1,
  },
  planTitle: {
    fontFamily: font.semibold,
    fontSize: 15,
    lineHeight: 18,
    color: colors.text,
  },
  planNote: {
    marginTop: 3,
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 15,
    color: colors.textSub,
  },
  planPrice: {
    alignItems: 'flex-end' as const,
  },
  planAmount: {
    fontFamily: font.semibold,
    fontSize: 16,
    lineHeight: 19,
    color: colors.text,
  },
  planPeriod: {
    marginTop: 2,
    fontFamily: font.regular,
    fontSize: 11.5,
    lineHeight: 14,
    color: colors.textDim,
  },
  owned: {
    marginTop: 28,
    padding: 18,
    borderRadius: radius.card,
    backgroundColor: colors.accentTint,
  },
  ownedTitle: {
    fontFamily: font.semibold,
    fontSize: 16,
    lineHeight: 20,
    color: colors.accentTintText,
  },
  ownedSub: {
    marginTop: 4,
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.accentTintText,
  },
  footer: {
    paddingTop: 10,
  },
  ctaRow: {
    flexDirection: 'row' as const,
  },
  fineprint: {
    marginTop: 10,
    fontFamily: font.regular,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textDim,
    textAlign: 'center' as const,
  },
  links: {
    marginTop: 10,
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    gap: 22,
  },
  link: {
    fontSize: 12.5,
    lineHeight: 15,
    color: colors.textSub,
  },
}));
