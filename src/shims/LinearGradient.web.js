// ─────────────────────────────────────────────────────────────────────────────
// src/shims/LinearGradient.web.js
// Web-safe drop-in replacement for expo-linear-gradient.
// Uses CSS linear-gradient via inline style — no native modules needed.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { View } from 'react-native';

/**
 * Matches the expo-linear-gradient API surface:
 *   colors, start, end, locations, style, children, ...rest
 */
export const LinearGradient = ({
  colors = ['#000', '#fff'],
  start  = { x: 0, y: 0 },
  end    = { x: 0, y: 1 },
  locations,
  style,
  children,
  ...rest
}) => {
  // Convert {x, y} to CSS "X% Y%" angle string
  const dx   = end.x - start.x;
  const dy   = end.y - start.y;
  // atan2 gives angle from positive-x axis; CSS counts from top (12 o'clock)
  const deg  = Math.round(Math.atan2(dy, dx) * (180 / Math.PI) + 90);

  const stops = colors
    .map((color, i) => {
      const pct = locations
        ? `${Math.round(locations[i] * 100)}%`
        : `${Math.round((i / (colors.length - 1)) * 100)}%`;
      return `${color} ${pct}`;
    })
    .join(', ');

  const gradientStyle = {
    backgroundImage: `linear-gradient(${deg}deg, ${stops})`,
  };

  return (
    <View style={[style, gradientStyle]} {...rest}>
      {children}
    </View>
  );
};

export default LinearGradient;
