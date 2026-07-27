import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { color, type } from './theme';

const R = 85;
const CIRCUMFERENCE = 2 * Math.PI * R; // ≈ 534, matching the design's fixed dasharray

/** The result screen's "score" presentation — an animated progress ring around the number. */
export function ScoreRing({ score, displayScore, ringColor }: { score: number; displayScore: number; ringColor: string }) {
  const { t } = useTranslation();
  const offset = CIRCUMFERENCE - CIRCUMFERENCE * (displayScore / 100);
  return (
    <View style={styles.wrap}>
      <Svg width={200} height={200} viewBox="0 0 200 200" style={styles.rotated}>
        <Circle cx={100} cy={100} r={R} fill="none" stroke="rgba(36,31,27,.08)" strokeWidth={14} />
        <Circle
          cx={100}
          cy={100}
          r={R}
          fill="none"
          stroke={ringColor}
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={styles.score}>{displayScore}</Text>
        <Text style={styles.outOf}>{t('result.outOf100')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 200, height: 200, alignSelf: 'center' },
  rotated: { transform: [{ rotate: '-90deg' }] },
  center: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: { ...type.metricLg, color: color.ink },
  outOf: { ...type.action, letterSpacing: 1.5, color: color.faint, marginTop: 2 },
});
