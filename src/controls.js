// Physical key positions keep WASD usable with a Japanese IME enabled.
export function gameKey(event){
 const physical={KeyW:'w',KeyA:'a',KeyS:'s',KeyD:'d',KeyE:'e',KeyQ:'q',KeyM:'m',KeyF:'f',KeyR:'r',Space:'space',ShiftLeft:'shift',ShiftRight:'shift',ArrowUp:'arrowup',ArrowDown:'arrowdown',ArrowLeft:'arrowleft',ArrowRight:'arrowright'};
 return physical[event.code]||String(event.key||'').toLowerCase();
}
