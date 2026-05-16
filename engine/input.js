// Input handler for touch and keyboard events
export const Input = {
  keys: {},
  touches: [],

  init() {
    document.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
    });
    document.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
    document.addEventListener('touchstart', (e) => {
      this.touches = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
    });
    document.addEventListener('touchmove', (e) => {
      this.touches = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
    });
    document.addEventListener('touchend', (e) => {
      this.touches = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
    });
  },

  isPressed(key) {
    return this.keys[key.toLowerCase()] === true;
  },

  getTouch(index = 0) {
    return this.touches[index] || null;
  }
};
