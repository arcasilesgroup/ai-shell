import { getConfig } from './config';

// Action glyphs for the run/revise selector.
// Default style is glyph-free: clack already marks the active option with a
// colored cursor, so the labels lean on color + copy instead of emoji.
// `ai config set ICONS=nerd` adds Nerd Font (Powerline/symbols) glyphs for
// terminals with a patched font (e.g. JetBrainsMono Nerd Font).
export type ActionIcons = {
  yes: string;
  edit: string;
  revise: string;
  copy: string;
  cancel: string;
};

const empty: ActionIcons = {
  yes: '',
  edit: '',
  revise: '',
  copy: '',
  cancel: '',
};

// Codepoints from "Symbols Nerd Font" (FontAwesome set):
// play, pencil, repeat, copy, times
const nerd: ActionIcons = {
  yes: '\uF04B ',
  edit: '\uF044 ',
  revise: '\uF079 ',
  copy: '\uF0C5 ',
  cancel: '\uF00D ',
};

export const getActionIcons = async (): Promise<ActionIcons> => {
  try {
    const { ICONS } = await getConfig();
    return ICONS === 'nerd' ? nerd : empty;
  } catch {
    return empty;
  }
};
