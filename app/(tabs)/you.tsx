import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { AccentTile } from '@/components/AccentTile';
import { InfoNote } from '@/components/InfoNote';
import { Screen } from '@/components/Screen';
import { Toggle } from '@/components/Toggle';
import { useProfile, useStore } from '@/data/store';
import type { Badge } from '@/data/types';
import { dayKey } from '@/lib/date';
import { themedStyles, useTheme } from '@/theme';
import { ACCENT_OPTIONS, font, radius, tracking, type ThemeMode } from '@/theme/tokens';

const COLUMNS = 4;

const THEME_CHOICES: { mode: ThemeMode; label: string }[] = [
  { mode: 'system', label: 'Auto' },
  { mode: 'dark', label: 'Dark' },
  { mode: 'light', label: 'Light' },
];

/** Rows of four, padded so a short last row keeps the column width. */
function inRows<T>(items: T[], perRow: number): (T | null)[][] {
  const rows: (T | null)[][] = [];
  for (let i = 0; i < items.length; i += perRow) {
    const row: (T | null)[] = items.slice(i, i + perRow);
    while (row.length < perRow) row.push(null);
    rows.push(row);
  }
  return rows;
}

/**
 * Tapping a notification row opens the surface it controls, so the weekly recap
 * (2h) and the lock-screen preview (2j) are reachable without adding chrome the
 * design doesn't have.
 */
const ROW_DESTINATION: Record<string, string> = {
  reminders: '/lock-screen',
  recap: '/recap',
};

/** Screen 2k — you. */
export default function You() {
  const router = useRouter();
  const {
    notifications,
    toggleNotification,
    habits,
    eraseAll,
    exportData,
    importData,
    themeMode,
    setThemeMode,
    accent,
    setAccent,
  } = useStore();
  const { name, xp, level, badges } = useProfile();
  const { text, colors } = useTheme();
  const styles = useStyles();
  const earned = badges.filter((b) => b.earned).length;

  const onExport = async () => {
    try {
      const json = await exportData();
      const name = `habito-backup-${dayKey()}.json`;
      if (Platform.OS === 'web') {
        // No share sheet on web — hand the browser a download instead.
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = name;
        anchor.click();
        URL.revokeObjectURL(url);
        return;
      }
      const file = new File(Paths.cache, name);
      if (file.exists) file.delete();
      file.create();
      file.write(json);
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: 'Export Habito data',
        UTI: 'public.json',
      });
    } catch (err) {
      Alert.alert('Export failed', err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  const onImport = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (picked.canceled) return;
      const asset = picked.assets[0];
      const json =
        Platform.OS === 'web'
          ? await (await fetch(asset.uri)).text()
          : new File(asset.uri).textSync();
      const counts = await importData(json);
      Alert.alert(
        'Import complete',
        `Restored ${counts.habits} habit${counts.habits === 1 ? '' : 's'} and ` +
          `${counts.entries} check-in${counts.entries === 1 ? '' : 's'}.`,
      );
    } catch (err) {
      Alert.alert('Import failed', err instanceof Error ? err.message : 'Could not read that file.');
    }
  };

  const onErase = () =>
    Alert.alert(
      'Erase all data?',
      'Every habit and check-in is deleted from this device. There is no cloud copy, so this cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase',
          style: 'destructive',
          onPress: () => {
            eraseAll();
            // Wiped state means not onboarded, so drop the tab stack and start over.
            router.replace('/onboarding');
          },
        },
      ],
    );

  return (
    <Screen gutter bottomExtra={0} safeBottom={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <Text style={text.screenTitle}>{name}</Text>

        <AccentTile r={radius.panel} style={styles.level}>
          <View style={styles.levelInner}>
            <View style={styles.levelHead}>
              <Text style={styles.levelName}>{level.name}</Text>
              <Text style={styles.levelXp}>{xp.toLocaleString('en-GB')} XP</Text>
            </View>
            <View style={styles.levelTrack}>
              <View style={[styles.levelFill, { width: `${level.progress * 100}%` }]} />
            </View>
            <Text style={styles.levelNext}>
              {level.next
                ? `${level.toNext} XP to ${level.next}`
                : 'Every level unlocked. Keep going anyway.'}
            </Text>
          </View>
        </AccentTile>

        <Text style={[text.label, styles.groupLabel]}>
          Badges · {earned} of {badges.length}
        </Text>
        <View style={styles.badgeGrid}>
          {inRows<Badge>(badges, COLUMNS).map((row, rowIndex) => (
            <View key={rowIndex} style={styles.badgeRow}>
              {row.map((badge, colIndex) =>
                badge ? (
                  <View
                    key={badge.name}
                    style={[styles.badge, badge.earned ? styles.badgeEarned : styles.badgeLocked]}
                  >
                    <Text
                      style={[
                        styles.badgeGlyph,
                        { color: badge.earned ? colors.accentText : colors.textLocked },
                      ]}
                    >
                      {badge.glyph}
                    </Text>
                    <Text
                      style={[
                        styles.badgeName,
                        { color: badge.earned ? colors.text : colors.textDim },
                      ]}
                    >
                      {badge.name}
                    </Text>
                  </View>
                ) : (
                  <View key={`spacer-${colIndex}`} style={styles.badgeSpacer} />
                ),
              )}
            </View>
          ))}
        </View>

        <Text style={[text.label, styles.groupLabel]}>Appearance</Text>
        <View style={styles.settings}>
          <View style={[styles.settingRow, styles.settingDivider]}>
            <View style={styles.settingText}>
              <Text style={styles.settingName}>Theme</Text>
              <Text style={styles.settingSub}>Auto follows your device</Text>
            </View>
            <View style={styles.segment}>
              {THEME_CHOICES.map(({ mode, label }) => {
                const selected = themeMode === mode;
                return (
                  <Pressable
                    key={mode}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${label} theme`}
                    onPress={() => setThemeMode(mode)}
                    style={[styles.segmentBtn, selected && styles.segmentBtnActive]}
                  >
                    <Text style={[styles.segmentLabel, selected && styles.segmentLabelActive]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingText}>
              <Text style={styles.settingName}>Accent colour</Text>
              <Text style={styles.settingSub}>Tints buttons, charts and streaks</Text>
            </View>
            <View style={styles.swatches}>
              {ACCENT_OPTIONS.map((option) => {
                const selected = accent === option;
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`Accent colour ${option}`}
                    onPress={() => setAccent(option)}
                    style={[
                      styles.swatch,
                      { backgroundColor: option },
                      selected && styles.swatchActive,
                    ]}
                  />
                );
              })}
            </View>
          </View>
        </View>

        <Text style={[text.label, styles.groupLabel]}>Notifications</Text>
        <View style={styles.settings}>
          {notifications.map((setting, index) => {
            const destination = ROW_DESTINATION[setting.id];
            return (
              <Pressable
                key={setting.id}
                disabled={!destination}
                accessibilityRole={destination ? 'button' : undefined}
                onPress={destination ? () => router.push(destination) : undefined}
                style={({ pressed }) => [
                  styles.settingRow,
                  index < notifications.length - 1 && styles.settingDivider,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.settingText}>
                  <Text style={styles.settingName}>{setting.name}</Text>
                  <Text style={styles.settingSub}>{setting.sub}</Text>
                </View>
                <Toggle
                  value={setting.enabled}
                  label={setting.name}
                  onChange={() => toggleNotification(setting.id)}
                />
              </Pressable>
            );
          })}
        </View>

        <View style={styles.budget}>
          <InfoNote>
            {habits.some((h) => h.reminder)
              ? 'Reminders fire at the time set on each habit. Change one from its Edit screen.'
              : 'No habit has a reminder time yet. Add one from a habit’s Edit screen.'}
          </InfoNote>
        </View>

        <Text style={[text.label, styles.groupLabel]}>Data</Text>
        <View style={styles.settings}>
          <Pressable
            accessibilityRole="button"
            onPress={onExport}
            style={({ pressed }) => [styles.settingRow, styles.settingDivider, pressed && styles.pressed]}
          >
            <View style={styles.settingText}>
              <Text style={styles.settingName}>Export data</Text>
              <Text style={styles.settingSub}>
                Save a copy of every habit and check-in as a file
              </Text>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onImport}
            style={({ pressed }) => [styles.settingRow, styles.settingDivider, pressed && styles.pressed]}
          >
            <View style={styles.settingText}>
              <Text style={styles.settingName}>Import data</Text>
              <Text style={styles.settingSub}>Restore from a Habito export</Text>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onErase}
            style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]}
          >
            <View style={styles.settingText}>
              <Text style={[styles.settingName, { color: colors.danger }]}>Erase all data</Text>
              <Text style={styles.settingSub}>
                Habito stores everything on this device and nowhere else
              </Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const useStyles = themedStyles(({ colors }) => ({
  body: {
    paddingBottom: 16,
  },
  level: {
    marginTop: 14,
  },
  levelInner: {
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  levelHead: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'baseline' as const,
  },
  levelName: {
    fontFamily: font.semibold,
    fontSize: 16,
    lineHeight: 18,
    letterSpacing: tracking(0.06, 16),
    color: colors.accentInk,
    textTransform: 'uppercase' as const,
  },
  levelXp: {
    fontFamily: font.semibold,
    fontSize: 12,
    lineHeight: 14,
    color: colors.accentInk,
  },
  levelTrack: {
    marginTop: 11,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(10, 30, 36, 0.25)',
    overflow: 'hidden' as const,
  },
  levelFill: {
    height: '100%' as const,
    borderRadius: 4,
    backgroundColor: colors.accentInk,
  },
  levelNext: {
    marginTop: 8,
    fontFamily: font.medium,
    fontSize: 12.5,
    lineHeight: 15,
    color: colors.accentInkMuted,
  },
  groupLabel: {
    marginTop: 14,
  },
  badgeGrid: {
    marginTop: 10,
    gap: 8,
  },
  badgeRow: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  badge: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: 11,
    paddingHorizontal: 6,
    alignItems: 'center' as const,
  },
  badgeSpacer: {
    flex: 1,
  },
  badgeEarned: {
    backgroundColor: colors.surface,
  },
  badgeLocked: {
    borderWidth: 1.5,
    borderStyle: 'dashed' as const,
    borderColor: colors.dashed,
  },
  badgeGlyph: {
    fontFamily: font.semibold,
    fontSize: 19,
    lineHeight: 21,
  },
  badgeName: {
    marginTop: 5,
    fontFamily: font.semibold,
    fontSize: 9.5,
    lineHeight: 12,
    textAlign: 'center' as const,
  },
  settings: {
    marginTop: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    overflow: 'hidden' as const,
  },
  settingRow: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 12,
  },
  settingDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  pressed: {
    opacity: 0.75,
  },
  settingText: {
    flex: 1,
  },
  settingName: {
    fontFamily: font.semibold,
    fontSize: 14,
    lineHeight: 17,
    color: colors.text,
  },
  settingSub: {
    marginTop: 3,
    fontFamily: font.regular,
    fontSize: 11.5,
    lineHeight: 15,
    color: colors.textSub,
  },
  segment: {
    flexDirection: 'row' as const,
    backgroundColor: colors.ground,
    borderRadius: radius.full,
    padding: 3,
    gap: 2,
  },
  segmentBtn: {
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: radius.full,
  },
  segmentBtnActive: {
    backgroundColor: colors.accent,
  },
  segmentLabel: {
    fontFamily: font.semibold,
    fontSize: 11,
    lineHeight: 13,
    color: colors.textSub,
  },
  segmentLabelActive: {
    color: colors.accentInk,
  },
  swatches: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  swatch: {
    width: 26,
    height: 26,
    borderRadius: radius.full,
  },
  swatchActive: {
    borderWidth: 2.5,
    borderColor: colors.text,
  },
  budget: {
    marginTop: 10,
  },
}));
