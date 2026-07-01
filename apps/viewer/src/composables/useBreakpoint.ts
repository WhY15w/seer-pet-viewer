import { onMounted, onUnmounted, ref } from "vue";

const MOBILE_QUERY = "(max-width: 768px)";

function readIsMobile(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_QUERY).matches;
}

let mediaQuery: MediaQueryList | null = null;
let listenerCount = 0;
let mediaListener: ((e: MediaQueryListEvent) => void) | null = null;
const isMobile = ref(readIsMobile());

function bindMediaQuery(): void {
  if (typeof window === "undefined") return;
  mediaQuery ??= window.matchMedia(MOBILE_QUERY);
  mediaListener ??= (e: MediaQueryListEvent) => {
    isMobile.value = e.matches;
  };
  mediaQuery.addEventListener("change", mediaListener);
}

function unbindMediaQuery(): void {
  if (!mediaQuery || !mediaListener) return;
  mediaQuery.removeEventListener("change", mediaListener);
}

export function useBreakpoint() {
  onMounted(() => {
    isMobile.value = readIsMobile();
    listenerCount++;
    if (listenerCount === 1) bindMediaQuery();
  });

  onUnmounted(() => {
    listenerCount = Math.max(0, listenerCount - 1);
    if (listenerCount === 0) unbindMediaQuery();
  });

  return { isMobile };
}
