import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { color } from './theme';

const W = 280;
const H = 110;
const PAD = 8;

/** The Insights screen's "score over time" line + area chart. */
export function TrendChart({ points }: { points: readonly number[] }) {
  if (points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = Math.max(1, max - min);
  const x = (i: number) => PAD + (i * (W - PAD * 2)) / (points.length - 1);
  const y = (v: number) => H - PAD - ((v - min) / span) * (H - PAD * 2);

  const line = points.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z`;
  const last = points.length - 1;

  return (
    <View style={styles.wrap}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        {[0.25, 0.5, 0.75].map((f) => {
          const gy = PAD + f * (H - PAD * 2);
          return <Line key={f} x1={0} x2={W} y1={gy} y2={gy} stroke="rgba(36,31,27,.07)" strokeWidth={1} />;
        })}
        <Path d={area} fill="rgba(216,90,74,.12)" />
        <Path d={line} fill="none" stroke={color.coral} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((v, i) => (
          <Circle
            key={i}
            cx={x(i)}
            cy={y(v)}
            r={i === last ? 4.5 : 3}
            fill={i === last ? color.coral : color.card}
            stroke={color.coral}
            strokeWidth={2}
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { width: '100%' } });
