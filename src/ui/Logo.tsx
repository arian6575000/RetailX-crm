import React from 'react';
import Svg, { Circle, Defs, Line, LinearGradient, Rect, Stop } from 'react-native-svg';

/** RetailX CRM monogram: white X with a cyan contact node, on the brand gradient (matches the launcher icon). */
export function Logo({ size = 72, plain = false }: { size?: number; plain?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="RetailX CRM logo" accessible>
      <Defs>
        <LinearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#4338CA" /><Stop offset="1" stopColor="#7C3AED" /></LinearGradient>
      </Defs>
      {plain ? null : <Rect width="100" height="100" rx="28" fill="url(#lg)" />}
      <Line x1="31" y1="31" x2="69" y2="69" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" />
      <Line x1="31" y1="69" x2="69" y2="31" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" />
      <Circle cx="69" cy="31" r="7.5" fill="#22D3EE" stroke="#4F3FD3" strokeWidth="1.8" />
    </Svg>
  );
}
