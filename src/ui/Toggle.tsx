import { StyleSheet, Switch, Text, View } from 'react-native';

import { color, space, type } from './theme';

export type ToggleRowProps = {
  label: string;
  sub: string;
  value: boolean;
  onChange: (v: boolean) => void;
  /** Omits the bottom divider — pass on the last row in a group. */
  last?: boolean;
};

/** A labelled on/off row — Settings' question/reminder/privacy toggles, and Onboarding's privacy step. */
export function ToggleRow({ label, sub, value, onChange, last }: ToggleRowProps) {
  return (
    <View style={[styles.row, !last && styles.divider]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.sub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: color.cardBorderStrong, true: color.olive }}
        thumbColor="#fffdf9"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: color.cardBorder },
  label: { ...type.label, color: color.ink },
  sub: { ...type.metaSm, color: color.faint, marginTop: 1 },
});
