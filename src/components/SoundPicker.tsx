import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { BottomSheet } from "./BottomSheet";
import { NavHeader } from "./NavHeader";
import { REMINDER_SOUNDS } from "@/data/catalog";
import type { ReminderSoundId } from "@/data/types";
import { SOUND_ASSETS } from "@/lib/sounds";
import { themedStyles, useTheme } from "@/theme";
import { font, radius } from "@/theme/tokens";

type Props = {
  visible: boolean;
  value: ReminderSoundId;
  onChange: (id: ReminderSoundId) => void;
  onDismiss: () => void;
};

/**
 * The reminder tone picker on the You screen. Tapping an option selects it and
 * plays it once, so choosing is done by ear rather than by name. The system
 * default has no bundled copy to preview — the OS owns that sound.
 *
 * Same header as the habit form: Cancel on the left, Save in accent on the
 * right. The choice is a draft until Save, so Cancel leaves the setting alone
 * and no reminder gets rescheduled for a tone that was only auditioned.
 */
export function SoundPicker({ visible, value, onChange, onDismiss }: Props) {
  const { text, colors } = useTheme();
  const styles = useStyles();
  const player = useAudioPlayer(null);
  const [draft, setDraft] = useState<ReminderSoundId>(value);

  // Reopen on the saved value, not on whatever was auditioned last time.
  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  // A tone picker that stays mute with the ringer switch off would read as
  // broken, so previews play through the silent switch on iOS.
  useEffect(() => {
    if (!visible) return;
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, [visible]);

  const save = () => {
    if (draft !== value) onChange(draft);
    onDismiss();
  };

  const pick = (id: ReminderSoundId) => {
    setDraft(id);
    if (id === "default") return;
    try {
      player.replace(SOUND_ASSETS[id]);
      player.seekTo(0);
      player.play();
    } catch {
      // Preview is a nicety; the selection itself has already been saved.
    }
  };

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss} maxHeight="78%">
      <NavHeader
        left={{ label: "Cancel", onPress: onDismiss }}
        title="Reminder sound"
        right={{ label: "Save", onPress: save, emphasis: "accent" }}
      />

      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.body}
      >
        <Text style={[text.sheetTitle, styles.title]}>Pick a tone</Text>
        <Text style={[text.bodySm, styles.blurb]}>
          Tap one to hear it. Every habit reminder uses it.
        </Text>

        <View style={styles.list}>
          {REMINDER_SOUNDS.map((sound, index) => {
            const selected = sound.id === draft;
            return (
              <Pressable
                key={sound.id}
                accessibilityRole="radio"
                accessibilityState={{ selected, checked: selected }}
                accessibilityLabel={`${sound.name}, ${sound.sub}`}
                onPress={() => pick(sound.id)}
                style={({ pressed }) => [
                  styles.row,
                  index < REMINDER_SOUNDS.length - 1 && styles.rowDivider,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.rowText}>
                  <Text style={styles.rowName}>{sound.name}</Text>
                  <Text style={styles.rowSub}>{sound.sub}</Text>
                </View>
                <View
                  style={[
                    styles.radio,
                    selected
                      ? {
                          borderColor: colors.accent,
                          backgroundColor: colors.accent,
                        }
                      : { borderColor: colors.ringAlt },
                  ]}
                >
                  {selected && (
                    <View
                      style={[
                        styles.radioDot,
                        { backgroundColor: colors.accentInk },
                      ]}
                    />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const useStyles = themedStyles(({ colors }) => ({
  body: {
    paddingBottom: 8,
  },
  title: {
    marginTop: 18,
  },
  blurb: {
    marginTop: 9,
  },
  list: {
    marginTop: 18,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    overflow: "hidden" as const,
  },
  row: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  pressed: {
    opacity: 0.75,
  },
  rowText: {
    flex: 1,
  },
  rowName: {
    fontFamily: font.semibold,
    fontSize: 14.5,
    lineHeight: 18,
    color: colors.text,
  },
  rowSub: {
    marginTop: 3,
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 15,
    color: colors.textSub,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    borderWidth: 2,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
}));
