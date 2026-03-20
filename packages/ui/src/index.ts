export const tokens = {
  spacing: [8, 12, 16, 24, 32],
  radius: {
    sm: 8,
    md: 12,
    lg: 16
  },
  typography: {
    display: { size: 32, lineHeight: 1.15, weight: 600 },
    h1: { size: 24, lineHeight: 1.2, weight: 600 },
    body: { size: 14, lineHeight: 1.5, weight: 450 },
    caption: { size: 12, lineHeight: 1.4, weight: 450 }
  },
  colors: {
    canvas: '#0f1115',
    surface: '#151923',
    surfaceElevated: '#1d2230',
    border: '#2a3142',
    text: '#f6f7fb',
    muted: '#99a3b8',
    primary: '#8ca8ff',
    accent: '#44d492'
  }
} as const;

export type DesignTokens = typeof tokens;
