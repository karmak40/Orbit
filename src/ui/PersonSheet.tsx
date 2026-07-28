import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SOURCES, STATUSES, type StatusId } from '../core/model';
import { DarkButton, GhostButton, TextAction } from './Button';
import { Chip } from './Chip';
import { translateEnum } from './i18nHelpers';
import { color, radius, space, type } from './theme';

export type PersonSheetInput = { name: string; source: string | null; status: StatusId; note: string };

export type PersonSheetProps = {
  visible: boolean;
  /** Present to edit; absent to create a new person. */
  initial?: PersonSheetInput;
  onCancel: () => void;
  onSave: (input: PersonSheetInput) => void;
  onDelete?: () => void;
};

const EMPTY: PersonSheetInput = { name: '', source: null, status: 'talking', note: '' };

/** Downward drag distance/speed past which releasing the sheet dismisses it. */
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 0.8;

/**
 * The design's Person Editor, as a modal sheet rather than a routed screen —
 * it's used identically from the log flow's "+ New person" chip, the People
 * tab's "+" button, and a profile's "Edit", and a sheet avoids threading a
 * return-to-route through three different callers (analysis doc's
 * `personReturn` state machine, simplified).
 */
export function PersonSheet({ visible, initial, onCancel, onSave, onDelete }: PersonSheetProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<PersonSheetInput>(initial ?? EMPTY);
  const translateY = useRef(new Animated.Value(800)).current;

  // PanResponder is built once (via useRef); route dismissal through a ref so
  // it always calls the latest onCancel rather than the one from first render.
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  // The entrance/exit slide is driven entirely by this Animated.Value rather
  // than the RN Modal's own `animationType="slide"` — on web that CSS
  // animation only completes via a native `animationend` event, which some
  // browser/webview states never fire, leaving the sheet stuck off-screen
  // (looks like the modal "doesn't come up") or stuck open (drag-to-dismiss
  // silently doing nothing).
  useEffect(() => {
    if (visible) {
      setDraft(initial ?? EMPTY);
      translateY.setValue(800);
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }).start();
    }
  }, [visible, initial, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      // Only claims the gesture once a clear downward drag starts, so a plain
      // tap on the grabber (or anything else) is never intercepted.
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) translateY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > DISMISS_DISTANCE || gesture.vy > DISMISS_VELOCITY) {
          Animated.timing(translateY, { toValue: 800, duration: 180, useNativeDriver: true }).start(() =>
            onCancelRef.current()
          );
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
        }
      },
    })
  ).current;

  const canSave = draft.name.trim().length > 0;

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onCancel}>
      {/*
        The backdrop and the sheet are siblings, not parent/child — a tap
        inside the sheet (including on a TextInput) must never be able to
        bubble up into the backdrop's `onPress`. An earlier version wrapped
        the sheet inside the backdrop Pressable and relied on
        `onStartShouldSetResponder` to "swallow" taps before they reached it;
        that doesn't reliably stop a real DOM click from bubbling on web, and
        a tap that starts on a TextInput could still dismiss the whole sheet.
        Sibling layout makes that class of bug structurally impossible: the
        sheet paints over the backdrop in the region it occupies, so nothing
        underneath it ever receives the tap.
      */}
      <View style={styles.root}>
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        />
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View {...panResponder.panHandlers} style={styles.dragZone}>
            <View style={styles.grabber} />
          </View>
          <View style={styles.scrollWrap}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets>
              <View style={styles.header}>
              <TextAction label={t('common.cancel')} onPress={onCancel} color={color.faint} />
              <Text style={styles.kicker}>{initial ? t('personSheet.editPerson') : t('personSheet.newPerson')}</Text>
            </View>

            <TextInput
              value={draft.name}
              onChangeText={(name) => setDraft((d) => ({ ...d, name }))}
              placeholder={t('personSheet.namePlaceholder')}
              placeholderTextColor={color.faint}
              style={styles.nameInput}
            />

            <Text style={styles.label}>{t('personSheet.whereDidYouMeet')}</Text>
            <View style={styles.wrap}>
              {SOURCES.map((s) => (
                <Chip
                  key={s}
                  label={translateEnum(t, 'source', SOURCES, s)}
                  tone="gold"
                  selected={draft.source === s}
                  onPress={() => setDraft((d) => ({ ...d, source: s }))}
                />
              ))}
            </View>

            <Text style={styles.label}>{t('personSheet.whereDoThingsStand')}</Text>
            <View style={{ gap: 9, marginBottom: space.xl }}>
              {STATUSES.map((s) => {
                const on = draft.status === s.id;
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => setDraft((d) => ({ ...d, status: s.id }))}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={[
                      styles.statusRow,
                      { borderColor: on ? s.color : color.cardBorderStrong, backgroundColor: on ? `${s.color}14` : color.card },
                    ]}>
                    <View style={[styles.statusDot, { backgroundColor: s.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.statusLabel}>{t(`status.${s.id}.label`)}</Text>
                      <Text style={styles.statusSub}>{t(`status.${s.id}.sub`)}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>{t('personSheet.privateNote')}</Text>
            <TextInput
              value={draft.note}
              onChangeText={(note) => setDraft((d) => ({ ...d, note }))}
              placeholder={t('personSheet.notePlaceholder')}
              placeholderTextColor={color.faint}
              multiline
              style={styles.noteInput}
            />

            <DarkButton
              label={initial ? t('personSheet.saveChanges') : t('personSheet.addPerson')}
              onPress={() => canSave && onSave(draft)}
              disabled={!canSave}
            />
            {onDelete ? (
              <View style={{ marginTop: space.lg }}>
                <GhostButton
                  label={t('personSheet.deletePersonAndDates', { name: draft.name || t('personSheet.thisPerson') })}
                  tone="danger"
                  onPress={onDelete}
                />
              </View>
            ) : null}
            <View style={{ height: space.xxl }} />
            </ScrollView>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(20,16,13,.5)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '88%',
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: space.gutter,
    paddingBottom: space.gutter,
  },
  dragZone: { paddingVertical: space.md, alignItems: 'center' },
  scrollWrap: { flex: 1 },
  grabber: { width: 38, height: 4, borderRadius: radius.pill, backgroundColor: color.cardBorderStrong },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.lg },
  kicker: { ...type.sectionLabel, color: color.gold },
  nameInput: {
    backgroundColor: color.card,
    borderWidth: 1.5,
    borderColor: color.cardBorderStrong,
    borderRadius: radius.md,
    padding: 15,
    ...type.rowTitleLg,
    color: color.ink,
    marginBottom: space.xl,
  },
  label: { ...type.label, color: color.ink, marginBottom: space.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: space.xl },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14, borderRadius: radius.md, borderWidth: 1.5 },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  statusLabel: { ...type.rowTitle, color: color.ink },
  statusSub: { ...type.metaSm, color: color.faint, marginTop: 1 },
  noteInput: {
    minHeight: 76,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.cardBorderStrong,
    borderRadius: radius.md,
    padding: 14,
    ...type.bodyXs,
    color: color.ink,
    marginBottom: space.xl,
    textAlignVertical: 'top',
  },
});
