import { useState } from 'react';
import { type LayoutChangeEvent, Pressable, ScrollView, Text, View } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { themedStyles, useTheme } from '@/theme';
import { alpha } from '@/theme/color';
import { font, radius, tracking } from '@/theme/tokens';

/**
 * Emoji rather than a glyph font: they're already full-colour on every
 * platform, need no asset pipeline, and store as a plain string.
 */
export const ICON_GROUPS: { title: string; icons: string[] }[] = [
  {
    title: 'Health',
    icons: ['💧', '💊', '🩺', '🧘', '😴', '🛏️', '🦷', '🧴', '🩹', '❤️', '🫁', '🧬'],
  },
  {
    title: 'Fitness',
    icons: ['🏃', '🚶', '🚴', '🏋️', '🤸', '🧗', '🏊', '⚽', '🏀', '🎾', '🥊', '🏸', '⛹️', '🤾', '🏌️', '🛹'],
  },
  {
    title: 'Food & drink',
    icons: ['🥗', '🍎', '🥕', '🍌', '🍓', '🥑', '🍳', '🥤', '☕', '🍵', '🚫', '🍷', '🍔', '🍫', '🧃', '🥛'],
  },
  {
    title: 'Mind',
    icons: ['🧠', '📖', '✍️', '📝', '🎯', '🙏', '🕌', '⛪', '🕯️', '🧩', '💭', '🌅'],
  },
  {
    title: 'Learning',
    icons: ['📚', '🎓', '💻', '🗣️', '🎹', '🎸', '🎨', '🎧', '🔬', '🧮', '🌍', '📐'],
  },
  {
    title: 'Work & money',
    icons: ['💼', '📈', '💰', '🧾', '💳', '🏦', '⏰', '📅', '✅', '📬', '🗂️', '💡'],
  },
  {
    title: 'Home',
    icons: ['🏠', '🧹', '🧺', '🪴', '🍽️', '🛒', '🐶', '🐱', '🔧', '🧽', '🗑️', '🛁'],
  },
  {
    title: 'Social & fun',
    icons: ['👨‍👩‍👧', '📞', '💌', '🤝', '🎲', '🎮', '🎬', '📸', '🎉', '🌳', '🏕️', '✈️'],
  },
  {
    title: 'Nature',
    icons: ['☀️', '🌙', '⭐', '🌈', '🔥', '🌊', '🌸', '🍀', '🦋', '🐝', '🌱', '⚡'],
  },
];

type Props = {
  visible: boolean;
  value?: string;
  onChange: (next: string | undefined) => void;
  onDismiss: () => void;
};

/** Bottom sheet from the habit form: pick an emoji for the habit's tile, or none. */
export function IconPicker({ visible, value, onChange, onDismiss }: Props) {
  const { colors, text } = useTheme();
  const styles = useStyles();
  // Six even columns whatever the sheet width, instead of a fixed tile that
  // leaves a ragged strip on the right.
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const tile = width > 0 ? Math.floor((width - GAP * (COLUMNS - 1)) / COLUMNS) : 48;

  const pick = (next: string | undefined) => {
    onChange(next);
    onDismiss();
  };

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss} maxHeight="78%">
      <View style={styles.head}>
        <Text style={text.sectionLabel}>Choose an icon</Text>
        {value && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remove icon"
            onPress={() => pick(undefined)}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Text style={styles.clear}>No icon</Text>
          </Pressable>
        )}
      </View>
      <ScrollView
        onLayout={onLayout}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.body}
      >
        {ICON_GROUPS.map((group) => (
          <View key={group.title} style={styles.group}>
            <Text style={[text.label, styles.groupTitle]}>{group.title}</Text>
            <View style={styles.grid}>
              {group.icons.map((icon) => {
                const selected = icon === value;
                return (
                  <Pressable
                    key={icon}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`Icon ${icon}`}
                    onPress={() => pick(icon)}
                    style={({ pressed }) => [
                      styles.tile,
                      { width: tile, height: tile },
                      selected && {
                        backgroundColor: alpha(colors.accent, 0.22),
                        borderColor: colors.accent,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text allowFontScaling={false} style={styles.glyph}>
                      {icon}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </BottomSheet>
  );
}

const COLUMNS = 6;
const GAP = 8;

const useStyles = themedStyles(({ colors }) => ({
  head: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 6,
  },
  clear: {
    fontFamily: font.semibold,
    fontSize: 12,
    lineHeight: 14,
    letterSpacing: tracking(0.06, 12),
    color: colors.accentText,
  },
  body: {
    paddingBottom: 8,
  },
  group: {
    marginTop: 14,
  },
  groupTitle: {
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: GAP,
  },
  tile: {
    borderRadius: radius.tile,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  glyph: {
    fontSize: 24,
    lineHeight: 30,
  },
  pressed: {
    opacity: 0.7,
  },
}));
