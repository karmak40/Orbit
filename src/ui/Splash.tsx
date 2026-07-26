import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { color, font, space } from './theme';

const ORBIT_BOX = 150;

/**
 * The design's launch splash (design/Dating Tracker.dc.html:37-53) — a dark
 * radial backdrop, a breathing glow, two counter-rotating orbit rings with a
 * trailing dot each, a gradient core, and the wordmark fading/scaling in.
 * Shown by `app/_layout.tsx` for a minimum hold, gated on real data readiness.
 */
export function Splash() {
  const breathe = useRef(new Animated.Value(0)).current;
  const outerSpin = useRef(new Animated.Value(0)).current;
  const innerSpin = useRef(new Animated.Value(0)).current;
  const coreIn = useRef(new Animated.Value(0)).current;
  const textIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const breatheLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    const outerLoop = Animated.loop(
      Animated.timing(outerSpin, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true })
    );
    const innerLoop = Animated.loop(
      Animated.timing(innerSpin, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true })
    );
    breatheLoop.start();
    outerLoop.start();
    innerLoop.start();
    Animated.timing(coreIn, {
      toValue: 1,
      duration: 900,
      easing: Easing.bezier(0.2, 0.8, 0.3, 1),
      useNativeDriver: true,
    }).start();
    Animated.timing(textIn, {
      toValue: 1,
      duration: 1000,
      delay: 150,
      easing: Easing.bezier(0.2, 0.8, 0.3, 1),
      useNativeDriver: true,
    }).start();

    return () => {
      breatheLoop.stop();
      outerLoop.stop();
      innerLoop.stop();
    };
  }, [breathe, outerSpin, innerSpin, coreIn, textIn]);

  const glowScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const glowOpacity = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.85] });
  const outerRotate = outerSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const innerRotate = innerSpin.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
  const coreScale = coreIn.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });
  const textTranslate = textIn.interpolate({ inputRange: [0, 1], outputRange: [6, 0] });

  return (
    <View style={styles.root}>
      <Svg style={StyleSheet.absoluteFillObject} width="100%" height="100%">
        <Defs>
          <RadialGradient id="bg" cx="50%" cy="35%" r="85%">
            <Stop offset="0%" stopColor="#3a332c" />
            <Stop offset="70%" stopColor="#241f1b" />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#bg)" />
      </Svg>

      <View style={styles.center}>
        <View style={styles.orbitBox}>
          <Animated.View style={[styles.glow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]}>
            <Svg width={ORBIT_BOX} height={ORBIT_BOX}>
              <Defs>
                <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor="#d85a4a" stopOpacity={0.35} />
                  <Stop offset="65%" stopColor="#d85a4a" stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx={ORBIT_BOX / 2} cy={ORBIT_BOX / 2} r={ORBIT_BOX / 2} fill="url(#glow)" />
            </Svg>
          </Animated.View>

          <Animated.View style={[styles.ringOuter, { transform: [{ rotate: outerRotate }] }]}>
            <View style={styles.dotGold} />
          </Animated.View>

          <Animated.View style={[styles.ringInner, { transform: [{ rotate: innerRotate }] }]}>
            <View style={styles.dotCoral} />
          </Animated.View>

          <Animated.View style={{ opacity: coreIn, transform: [{ scale: coreScale }] }}>
            <LinearGradient
              colors={['#d85a4a', '#c8912f']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.core}
            />
          </Animated.View>
        </View>

        <Animated.View style={{ opacity: textIn, transform: [{ translateY: textTranslate }], alignItems: 'center' }}>
          <Text style={styles.word}>Orbit</Text>
          <Text style={styles.tagline}>Your dating life, observed</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#241f1b' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xxl },
  orbitBox: { width: ORBIT_BOX, height: ORBIT_BOX, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: ORBIT_BOX, height: ORBIT_BOX },
  ringOuter: {
    position: 'absolute',
    top: 14,
    left: 14,
    width: ORBIT_BOX - 28,
    height: ORBIT_BOX - 28,
    borderRadius: (ORBIT_BOX - 28) / 2,
    borderWidth: 1,
    borderColor: 'rgba(200,145,47,.35)',
  },
  dotGold: {
    position: 'absolute',
    top: -4,
    left: '50%',
    marginLeft: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: color.goldLight,
  },
  ringInner: {
    position: 'absolute',
    top: 32,
    left: 32,
    width: ORBIT_BOX - 64,
    height: ORBIT_BOX - 64,
    borderRadius: (ORBIT_BOX - 64) / 2,
    borderWidth: 1,
    borderColor: 'rgba(216,90,74,.4)',
  },
  dotCoral: {
    position: 'absolute',
    bottom: -3,
    left: '50%',
    marginLeft: -3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: color.coral,
  },
  core: { width: 56, height: 56, borderRadius: 28 },
  word: { fontFamily: font.serif, fontSize: 40, lineHeight: 46, color: color.onInk, letterSpacing: 0.4 },
  tagline: {
    fontFamily: font.sansSemi,
    fontSize: 11,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: color.faint,
    marginTop: 10,
  },
});
