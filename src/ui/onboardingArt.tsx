import type { ReactNode } from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

import { color } from './theme';

const SIZE = 185;

/** Slide 1 — concentric orbits, transcribed from the prototype's `artOrbit()`. */
export function ArtOrbit() {
  return (
    <Svg viewBox="0 0 200 200" width={SIZE} height={SIZE}>
      <Circle cx={100} cy={100} r={34} fill="none" stroke="rgba(36,31,27,.13)" strokeWidth={1} />
      <Circle cx={100} cy={100} r={58} fill="none" stroke="rgba(36,31,27,.13)" strokeWidth={1} strokeDasharray="4 6" />
      <Circle cx={100} cy={100} r={82} fill="none" stroke="rgba(36,31,27,.13)" strokeWidth={1} />
      <Circle cx={100} cy={100} r={20} fill={color.coral} />
      <Circle cx={100} cy={42} r={7} fill={color.gold} />
      <Circle cx={158} cy={118} r={6} fill={color.olive} />
      <Circle cx={52} cy={128} r={5} fill={color.muted} />
    </Svg>
  );
}

/** Slide 2 — a 4×5 dot grid with a varying fill count per row, from `artDots()`. */
export function ArtDots() {
  const rows = [5, 4, 3, 5];
  const dots: ReactNode[] = [];
  rows.forEach((filled, r) => {
    for (let i = 0; i < 5; i++) {
      const on = i < filled;
      dots.push(
        <Circle
          key={`${r}-${i}`}
          cx={30 + i * 35}
          cy={38 + r * 40}
          r={12}
          fill={on ? color.coral : 'none'}
          stroke={on ? color.coral : 'rgba(36,31,27,.18)'}
          strokeWidth={1.5}
        />
      );
    }
  });
  return (
    <Svg viewBox="0 0 200 200" width={SIZE} height={SIZE}>
      {dots}
    </Svg>
  );
}

/** Slide 3 — an upward trend line with a star marker, from `artChart()`. */
export function ArtChart() {
  const pts: [number, number][] = [
    [20, 150],
    [60, 120],
    [100, 128],
    [140, 74],
    [180, 48],
  ];
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
  const area = `${line} L180,175 L20,175 Z`;
  return (
    <Svg viewBox="0 0 200 200" width={SIZE} height={SIZE}>
      <Path d={area} fill="rgba(216,90,74,.12)" />
      <Path d={line} fill="none" stroke={color.coral} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <Circle key={i} cx={p[0]} cy={p[1]} r={5} fill="#fffdf9" stroke={color.coral} strokeWidth={2.5} />
      ))}
      <Path d="M150 30l3 7 7 .7-5.3 5 1.6 7-6.3-3.7-6.3 3.7 1.6-7-5.3-5 7-.7z" fill={color.gold} />
    </Svg>
  );
}
