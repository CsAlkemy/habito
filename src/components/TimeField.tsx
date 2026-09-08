import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { themedStyles, useTheme } from '@/theme';

/**
 * A reminder time ("HH:MM", 24-hour) edited with the device's own picker:
 * the system compact picker on iOS, the system time dialog on Android. The
 * web build keeps a plain text input so the browser harness can type into it.
 */

const toDate = (value: string) => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  const date = new Date();
  date.setHours(match ? Number(match[1]) : 8, match ? Number(match[2]) : 0, 0, 0);
  return date;
};

const toHHMM = (date: Date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

type Props = {
  /** "HH:MM", or '' when no reminder is set */
  value: string;
  onChange: (next: string) => void;
  /** shown when value is '' — tapping it turns the reminder on */
  placeholder?: string;
  /** layout, applied on every platform */
  style?: StyleProp<ViewStyle>;
  /** field chrome (background, padding) — skipped on iOS, whose compact picker draws its own pill */
  fieldStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function TimeField({ value, onChange, placeholder = 'Off', style, fieldStyle, textStyle }: Props) {
  const { colors, dark } = useTheme();
  const styles = useStyles();

  if (Platform.OS === 'web') {
    return (
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="08:00"
        placeholderTextColor={colors.textDim}
        maxLength={5}
        style={[style, fieldStyle, textStyle]}
      />
    );
  }

  if (Platform.OS === 'ios' && value) {
    return (
      <View style={[styles.iosWrap, style]}>
        <DateTimePicker
          value={toDate(value)}
          mode="time"
          display="compact"
          themeVariant={dark ? 'dark' : 'light'}
          accentColor={colors.accent}
          onChange={(_event, date) => date && onChange(toHHMM(date))}
        />
      </View>
    );
  }

  // Android always, and iOS while off: a pressable that opens (or arms) the picker.
  const onPress = () => {
    if (Platform.OS === 'ios') {
      // No imperative API on iOS — setting a time swaps in the compact picker above.
      onChange(toHHMM(toDate(value)));
      return;
    }
    DateTimePickerAndroid.open({
      value: toDate(value),
      mode: 'time',
      is24Hour: true,
      onChange: (event, date) => {
        if (event.type === 'set' && date) onChange(toHHMM(date));
      },
    });
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Remind me at, ${value || placeholder}`}
      onPress={onPress}
      style={({ pressed }) => [style, fieldStyle, pressed && styles.pressed]}
    >
      <Text style={[styles.value, textStyle]}>{value || placeholder}</Text>
    </Pressable>
  );
}

const useStyles = themedStyles(({ colors }) => ({
  iosWrap: {
    alignItems: 'flex-start' as const,
  },
  value: {
    color: colors.text,
  },
  pressed: {
    opacity: 0.85,
  },
}));
