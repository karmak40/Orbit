import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { GhostButton } from './Button';
import { color, radius, space, type } from './theme';

export type ConfirmSheetProps = {
  visible: boolean;
  title: string;
  body: string;
  cta: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/** The design's destructive-confirm bottom sheet ("Delete this date?", "Delete {name}?"). */
export function ConfirmSheet({ visible, title, body, cta, onConfirm, onCancel }: ConfirmSheetProps) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <View style={{ gap: space.sm }}>
            <Pressable onPress={onConfirm} accessibilityRole="button" style={styles.dangerButton}>
              <Text style={styles.dangerLabel}>{cta}</Text>
            </Pressable>
            <GhostButton label="Keep it" onPress={onCancel} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(20,16,13,.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#f7f2ea',
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: space.gutter,
    paddingBottom: space.xxl,
  },
  grabber: { width: 38, height: 4, borderRadius: radius.pill, backgroundColor: color.cardBorderStrong, alignSelf: 'center', marginBottom: space.xl },
  title: { ...type.title, fontSize: 24, color: color.ink, marginBottom: space.sm },
  body: { ...type.bodySm, color: color.textSoft, marginBottom: space.xl },
  dangerButton: { width: '100%', backgroundColor: color.red, borderRadius: radius.lg, padding: 17, alignItems: 'center' },
  dangerLabel: { ...type.button, color: '#fff' },
});
