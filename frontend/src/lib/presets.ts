import type { NebulaTheme } from './theme.ts';

/**
 * Each sets its text on accent: core's white is too faint on Mint's bright accent for badges, checkboxes and
 * switches, and '' on the others resets a value left by the site or a preset applied before.
 */
export const PRESETS: { name: string; theme: Partial<NebulaTheme> }[] = [
  {
    name: 'Mint',
    theme: {
      accent: '#2fbf8f',
      highlight: '#b4f2dc',
      background: '#101a1b',
      surface: '#0b1314',
      text: '#e5f3ee',
      textOnAccent: '#0b1314',
    },
  },
  {
    name: 'Midnight',
    theme: {
      accent: '#1e88c7',
      highlight: '#8fe3c8',
      background: '#16122a',
      surface: '#110b21',
      text: '#e6e4f0',
      textOnAccent: '',
    },
  },
  {
    name: 'Stellar',
    theme: {
      accent: '#3b6cde',
      highlight: '#8fb4ff',
      background: '#1b1c30',
      surface: '#222339',
      text: '#e2e4ee',
      textOnAccent: '',
    },
  },
  {
    name: 'Emerald',
    theme: {
      accent: '#1f9d74',
      highlight: '#9be7c4',
      background: '#0f1a16',
      surface: '#0b1411',
      text: '#e3efe9',
      textOnAccent: '',
    },
  },
  {
    name: 'Ember',
    theme: {
      accent: '#d9622b',
      highlight: '#ffc59b',
      background: '#1a1210',
      surface: '#130c0a',
      text: '#f1e7e2',
      textOnAccent: '',
    },
  },
  {
    name: 'Graphite',
    theme: {
      accent: '#6c7cff',
      highlight: '#b9c0ff',
      background: '#16171b',
      surface: '#101114',
      text: '#e7e8ec',
      textOnAccent: '',
    },
  },
];
