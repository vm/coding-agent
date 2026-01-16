type ScrollCallback = (direction: 'up' | 'down') => void;
let scrollCallback: ScrollCallback | null = null;

export function setScrollCallback(cb: ScrollCallback | null) {
  scrollCallback = cb;
}

export function emitScroll(direction: 'up' | 'down') {
  scrollCallback?.(direction);
}
