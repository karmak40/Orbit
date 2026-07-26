import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';

import { color } from './theme';

const CX = 100;
const CY = 100;
const R = 70;

function point(i: number, radius: number): [number, number] {
  const angle = ((-90 + i * 72) * Math.PI) / 180;
  return [CX + Math.cos(angle) * radius, CY + Math.sin(angle) * radius];
}

/** The result screen's "radar" presentation — five dimensions on a pentagon. */
export function RadarChart({ axes }: { axes: readonly [string, number][] }) {
  const grid = [0.34, 0.67, 1].map((lvl, i) => (
    <Polygon
      key={i}
      points={axes.map((_, ai) => point(ai, R * lvl).join(',')).join(' ')}
      fill="none"
      stroke="rgba(36,31,27,.1)"
      strokeWidth={1}
    />
  ));
  const spokes = axes.map((_, i) => {
    const [x, y] = point(i, R);
    return <Line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="rgba(36,31,27,.08)" strokeWidth={1} />;
  });
  const dataPoints = axes.map((a, i) => point(i, R * (Math.max(a[1], 0.4) / 5)));
  const labels = axes.map((a, i) => {
    const [x, y] = point(i, R + 18);
    return (
      <SvgText key={i} x={x} y={y} fontSize={10} fontWeight="700" fill={color.muted} textAnchor="middle">
        {a[0]}
      </SvgText>
    );
  });

  return (
    <View style={styles.wrap}>
      <Svg width={210} height={210} viewBox="0 0 200 200">
        {grid}
        {spokes}
        <Polygon
          points={dataPoints.map((p) => p.join(',')).join(' ')}
          fill="rgba(216,90,74,.18)"
          stroke={color.coral}
          strokeWidth={2}
        />
        {dataPoints.map((p, i) => (
          <Circle key={i} cx={p[0]} cy={p[1]} r={3.2} fill={color.coral} />
        ))}
        {labels}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { alignSelf: 'center' } });
