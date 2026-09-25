// One 64 px drawing grid for every control. Stroke and optical size stay consistent.
export const iconPaths = {
  arrow: '<path d="M12 32h40M34 14l18 18-18 18"/>',
  back: '<path d="M52 32H12M30 14 12 32l18 18"/>',
  restart: '<path d="M15 23a20 20 0 1 1-2 22M15 11v14h14"/>',
  close: '<path d="m18 18 28 28M46 18 18 46"/>',
  exit: '<path d="M27 12H12v40h15M38 22l10 10-10 10M25 32h23"/>',
  registration: '<rect x="9" y="9" width="46" height="46" rx="9"/><circle cx="26" cy="25" r="7"/><path d="M16 45c0-7 4-11 10-11s10 4 10 11M42 24h5M42 34h5"/>',
  gift: '<rect x="10" y="23" width="44" height="11" rx="3"/><path d="M14 34v20h36V34M32 23v31M32 23H22c-13 0-10-16-2-14 6 1 9 7 12 14Zm0 0h10c13 0 10-16 2-14-6 1-9 7-12 14Z"/>',
  trophy: '<path d="M20 11h24v15c0 11-5 17-12 17s-12-6-12-17V11ZM20 16h-9v7c0 9 5 14 13 15M44 16h9v7c0 9-5 14-13 15M32 43v11M23 54h18"/>',
  star: '<path d="m32 6 8 17 19 3-14 13 3 19-16-9-16 9 3-19L5 26l19-3Z"/>',
};
export const icon = (name, cls = '') => `<svg class="ui-icon ${cls}" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || iconPaths.arrow}</svg>`;
