// Small etched illustrations, kept legible on both the blocks and the pocket HUD.
const scenes={
 write:'<path d="M23 16h28l8 9v38H23Z"/><path d="M50 16v11h9M32 37h18m-18 9h12m-12 9h18"/><path d="m12 22 3-7 3 7m-6-3h6" opacity=".6"/>',
 tower:'<path d="M18 53V29h13v24m4 0V14h14v39m4 0V34h10v19"/><path d="M21 35h7m-7 7h7m11-21h6m-6 8h6m-6 8h6m-6 8h6m12-4h4M14 55h53"/>',
 star:'<path d="m40 12 6 20 20 8-20 7-6 20-7-20-20-7 20-8Z"/><path d="m59 11 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" opacity=".6"/>',
 promise:'<rect x="13" y="28" width="23" height="20" rx="7"/><rect x="44" y="28" width="23" height="20" rx="7"/><path d="M21 36v3m7-3v3m24-3v3m7-3v3M17 54h46m-42 0v8m38-8v8M36 22l4-9 4 9m-8-4h8"/><path d="M30 49c5 7 14 7 20 0"/>',
 together:'<path d="M40 62V33m0 15L20 34m20 14 20-14M19 26l-4-8m50 8 4-8M40 23V12"/><circle cx="40" cy="29" r="6"/><circle cx="17" cy="31" r="6"/><circle cx="63" cy="31" r="6"/><path d="M29 64h22"/>',
};
export function memoryPicture(motif){return '<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(scenes[motif]||scenes.star)+'</svg>';}
