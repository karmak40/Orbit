import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { color, radius, space, type } from './theme';

export type SelectOption<T extends string> = { value: T; label: string };

export type SelectFieldProps<T extends string> = {
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  /** Heading shown above the option list in the picker sheet. */
  sheetTitle?: string;
};

/**
 * A closed-by-default select box: a single row showing the current value and
 * a chevron, which opens a bottom sheet of options on tap — the compact
 * counterpart to `Segmented`'s always-expanded row, used where the option
 * list is longer than two or three items (e.g. Settings' language picker).
 */
export function SelectField<T extends string>({ value, options, onChange, sheetTitle }: SelectFieldProps<T>) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={sheetTitle}
        accessibilityValue={{ text: current?.label }}
        style={({ pressed }) => [styles.field, pressed && styles.fieldPressed]}>
        <Text style={styles.value}>{current?.label ?? ''}</Text>
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color.faint} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M7 10l5 5 5-5" />
        </Svg>
      </Pressable>

      {/* animationType="none": RN Web's fade/slide transitions only complete via a
          native `animationend` event, which doesn't always fire — leaving the sheet
          stuck open or never appearing. Instant show/hide is reliable everywhere. */}
      <Modal visible={open} animationType="none" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.grabber} />
            {sheetTitle ? <Text style={styles.sheetTitle}>{sheetTitle}</Text> : null}
            <ScrollView showsVerticalScrollIndicator={false}>
              {options.map((opt, i) => {
                const selected = opt.value === value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[styles.optionRow, i < options.length - 1 && styles.divider]}>
                    <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{opt.label}</Text>
                    {selected ? <Text style={styles.check}>✓</Text> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: space.lg,
  },
  fieldPressed: { backgroundColor: color.chip },
  value: { ...type.label, color: color.ink },

  backdrop: { flex: 1, backgroundColor: 'rgba(20,16,13,.5)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '70%',
    backgroundColor: '#f7f2ea',
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: space.gutter,
    paddingBottom: space.xxl,
  },
  grabber: {
    width: 38,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: color.cardBorderStrong,
    alignSelf: 'center',
    marginVertical: space.md,
  },
  sheetTitle: { ...type.title, fontSize: 20, color: color.ink, marginBottom: space.sm },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: color.cardBorder },
  optionLabel: { ...type.label, color: color.ink },
  optionLabelSelected: { color: color.red },
  check: { ...type.label, color: color.red },
});
