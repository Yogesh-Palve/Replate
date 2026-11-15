export type ToastType = "success" | "error" | "warning" | "info";

export type ToastNotification = {
  id: number;
  type: ToastType;
  message: string;
  duration: number | null;
};

export type ToastOptions = { duration?: number | null };

export const DEFAULT_TOAST_DURATION = 4500;

export function createToastNotification(id: number, type: ToastType, message: string, options: ToastOptions = {}): ToastNotification {
  return {
    id,
    type,
    message: message.trim(),
    duration: options.duration === undefined ? DEFAULT_TOAST_DURATION : options.duration,
  };
}

export function isSameToast(current: ToastNotification | null, next: ToastNotification): boolean {
  return current?.type === next.type && current.message === next.message;
}

export function createToastTimer(
  schedule: (callback: () => void, duration: number) => unknown = (callback, duration) => setTimeout(callback, duration),
  cancel: (handle: unknown) => void = handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
) {
  let handle: unknown;
  let scheduled = false;
  let generation = 0;

  return {
    schedule(duration: number | null, callback: () => void) {
      this.clear();
      if (duration === null) return;
      const currentGeneration = ++generation;
      handle = schedule(() => {
        if (currentGeneration !== generation) return;
        scheduled = false;
        handle = undefined;
        callback();
      }, duration);
      scheduled = true;
    },
    clear() {
      generation++;
      if (scheduled) cancel(handle);
      handle = undefined;
      scheduled = false;
    },
  };
}
