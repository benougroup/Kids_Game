export const TILE_SIZE = 32;
export const TARGET_FPS = 60;

export const DIALOGUE_UI_CONFIG = {
  dialogueBoxHeightRatio: 0.33,
  paddingPx: 18,
  speakerFontPx: 20,
  bodyFontPx: 22,
  choiceFontPx: 20,
  buttonHeightPx: 56,
  maxLinesBeforeOverflow: 4,
  lineHeightPx: 30,
  theme: {
    panelBg: 'rgba(8, 14, 24, 0.92)',
    panelStroke: '#cbe8ff',
    text: '#ffffff',
    choiceBg: 'rgba(82,194,255,0.25)',
    choiceStroke: '#8fdcff',
  },
} as const;
