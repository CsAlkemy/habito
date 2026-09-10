import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { ColorValue, GestureResponderEvent, LayoutChangeEvent } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { NavHeader } from './NavHeader';
import { themedStyles, useTheme } from '@/theme';
import { hexToHsl, hslToHex, normalizeHex, type HSL } from '@/theme/color';
import { ACCENT_OPTIONS, font, radius } from '@/theme/tokens';

type Stops = readonly [ColorValue, ColorValue, ...ColorValue[]];

/** The full hue sweep, also drawn on the "custom colour" swatch that opens this sheet. */
export const HUE_STOPS: Stops = [
  '#ff5f5f',
  '#ffd15f',
  '#7fe07f',
  '#5fe0e0',
  '#6f8fff',
  '#e07fe0',
  '#ff5f5f',
];

const THUMB = 26;

type Props = {
  visible: boolean;
  /** the colour to open on, as `#rrggbb` */
  value: string;
  onChange: (hex: string) => void;
  onDismiss: () => void;
  title?: string;
  /** quick starting points shown under the sliders */
  presets?: readonly string[];
};

type Draft = { hsl: HSL; hex: string };

const fromHex = (hex: string): Draft => ({ hsl: hexToHsl(hex), hex: normalizeHex(hex) ?? hex });

/**
 * A free colour picker: hue, saturation and lightness sliders with a live
 * preview, plus a hex field for pasting an exact value. Like the sound picker,
 * the choice is a draft until Save so Cancel leaves the caller's colour alone.
 *
 * The draft keeps both the HSL the sliders drive and the hex it came from, so
 * a typed `#72d7f0` saves as exactly that rather than as its round trip.
 */
export function ColorPicker({
  visible,
  value,
  onChange,
  onDismiss,
  title = 'Pick a colour',
  presets = ACCENT_OPTIONS,
}: Props) {
  const { text, colors } = useTheme();
  const styles = useStyles();
  const [draft, setDraft] = useState<Draft>(() => fromHex(value));
  const [hexText, setHexText] = useState(draft.hex);

  useEffect(() => {
    if (!visible) return;
    const next = fromHex(value);
    setDraft(next);
    setHexText(next.hex);
  }, [visible, value]);

  const setHsl = (patch: Partial<HSL>) => {
    const hsl = { ...draft.hsl, ...patch };
    const hex = hslToHex(hsl.h, hsl.s, hsl.l);
    setDraft({ hsl, hex });
    setHexText(hex);
  };

  const setHex = (hex: string) => {
    setDraft(fromHex(hex));
    setHexText(normalizeHex(hex) ?? hex);
  };

  const onHexText = (typed: string) => {
    setHexText(typed);
    const hex = normalizeHex(typed);
    if (hex) setDraft(fromHex(hex));
  };

  const save = () => {
    if (draft.hex !== normalizeHex(value)) onChange(draft.hex);
    onDismiss();
  };

  const { h, s, l } = draft.hsl;
  const hexValid = normalizeHex(hexText) !== null;

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss} maxHeight="92%" avoidKeyboard>
      <NavHeader
        left={{ label: 'Cancel', onPress: onDismiss }}
        title={title}
        right={{ label: 'Save', onPress: save, emphasis: 'accent' }}
      />

      <View style={styles.preview}>
        <View style={[styles.previewSwatch, { backgroundColor: draft.hex }]} />
        <View style={styles.hexField}>
          <Text style={styles.hexHash}>#</Text>
          <TextInput
            value={hexText.replace(/^#/, '')}
            onChangeText={(typed) => onHexText(typed)}
            onBlur={() => setHexText(draft.hex)}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={6}
            accessibilityLabel="Hex colour"
            placeholder="72d7f0"
            placeholderTextColor={colors.textDim}
            style={[styles.hexInput, !hexValid && { color: colors.danger }]}
          />
        </View>
      </View>

      <Slider
        label="Hue"
        value={h}
        max={360}
        stops={HUE_STOPS}
        thumb={hslToHex(h, 100, 50)}
        onChange={(next) => setHsl({ h: next })}
      />
      <Slider
        label="Saturation"
        value={s}
        max={100}
        stops={[hslToHex(h, 0, l), hslToHex(h, 100, l)]}
        thumb={draft.hex}
        onChange={(next) => setHsl({ s: next })}
      />
      <Slider
        label="Lightness"
        value={l}
        max={100}
        stops={[hslToHex(h, s, 0), hslToHex(h, s, 50), hslToHex(h, s, 100)]}
        thumb={draft.hex}
        onChange={(next) => setHsl({ l: next })}
      />

      <Text style={[text.label, styles.presetsLabel]}>Presets</Text>
      <View style={styles.presets}>
        {presets.map((preset) => {
          const selected = normalizeHex(preset) === draft.hex;
          return (
            <Pressable
              key={preset}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Colour ${preset}`}
              onPress={() => setHex(preset)}
              style={[styles.presetRing, selected && { borderColor: colors.text }]}
            >
              <View style={[styles.preset, { backgroundColor: preset }]} />
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

type SliderProps = {
  label: string;
  value: number;
  max: number;
  stops: Stops;
  /** fill of the thumb — the colour at the current position */
  thumb: string;
  onChange: (next: number) => void;
};

/**
 * A gradient track with a draggable thumb. Built on the responder system
 * rather than a gesture library so the same code runs on the web harness.
 */
function Slider({ label, value, max, stops, thumb, onChange }: SliderProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const [width, setWidth] = useState(0);

  const fromTouch = (event: GestureResponderEvent) => {
    if (!width) return;
    const ratio = Math.min(1, Math.max(0, event.nativeEvent.locationX / width));
    onChange(Math.round(ratio * max));
  };
  const step = (delta: number) => onChange(Math.min(max, Math.max(0, Math.round(value) + delta)));
  const left = width ? (value / max) * width - THUMB / 2 : 0;

  return (
    <View style={styles.slider}>
      <View style={styles.sliderHead}>
        <Text style={styles.sliderLabel}>{label}</Text>
        <Text style={styles.sliderValue}>{Math.round(value)}</Text>
      </View>
      <View
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min: 0, max, now: Math.round(value) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) =>
          step(event.nativeEvent.actionName === 'increment' ? max / 20 : -max / 20)
        }
        onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={fromTouch}
        onResponderMove={fromTouch}
        style={styles.track}
      >
        <LinearGradient
          colors={stops}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.trackFill}
          pointerEvents="none"
        />
        <View
          pointerEvents="none"
          style={[styles.thumb, { left, backgroundColor: thumb, borderColor: colors.text }]}
        />
      </View>
    </View>
  );
}

const useStyles = themedStyles(({ colors }) => ({
  preview: {
    marginTop: 18,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 14,
  },
  previewSwatch: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hexField: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    height: 44,
  },
  hexHash: {
    fontFamily: font.medium,
    fontSize: 16,
    color: colors.textDim,
    marginRight: 2,
  },
  hexInput: {
    flex: 1,
    fontFamily: font.semibold,
    fontSize: 16,
    color: colors.text,
    padding: 0,
  },
  slider: {
    marginTop: 18,
  },
  sliderHead: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 8,
  },
  sliderLabel: {
    fontFamily: font.semibold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  sliderValue: {
    fontFamily: font.medium,
    fontSize: 13,
    color: colors.textSub,
    fontVariant: ['tabular-nums'] as const,
  },
  track: {
    height: THUMB,
    justifyContent: 'center' as const,
  },
  trackFill: {
    height: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: {
    position: 'absolute' as const,
    width: THUMB,
    height: THUMB,
    borderRadius: radius.full,
    borderWidth: 2.5,
  },
  presetsLabel: {
    marginTop: 22,
  },
  presets: {
    marginTop: 10,
    marginBottom: 6,
    flexDirection: 'row' as const,
    gap: 8,
  },
  presetRing: {
    padding: 2,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  preset: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
  },
}));
