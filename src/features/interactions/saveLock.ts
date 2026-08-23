/** Prevents a second in-flight save from starting. */
export function createSaveLock() {
  let pending = false;
  return {
    tryStart() {
      if (pending) return false;
      pending = true;
      return true;
    },
    finish() {
      pending = false;
    },
    get pending() {
      return pending;
    },
  };
}
