import { useSyncExternalStore } from 'react';

const MOBILE_BREAKPOINT = 1023;
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT}px)`;

function getViewportWidth() {
  return Math.min(
    window.innerWidth,
    window.visualViewport?.width ?? window.innerWidth,
    document.documentElement.clientWidth || window.innerWidth,
  );
}

function getSnapshot() {
  if (typeof window === 'undefined') {
    return false;
  }

  if (!window.matchMedia) {
    return getViewportWidth() <= MOBILE_BREAKPOINT;
  }

  return window.matchMedia(MOBILE_QUERY).matches || getViewportWidth() <= MOBILE_BREAKPOINT;
}

function subscribe(cb: () => void) {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const mql = window.matchMedia?.(MOBILE_QUERY);
  const visualViewport = window.visualViewport;

  const handleChange = () => cb();

  if (mql) {
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handleChange);
    } else if (typeof mql.addListener === 'function') {
      mql.addListener(handleChange);
    }
  }

  window.addEventListener('resize', handleChange, { passive: true });
  window.addEventListener('orientationchange', handleChange, { passive: true });
  visualViewport?.addEventListener('resize', handleChange, { passive: true });

  return () => {
    if (mql) {
      if (typeof mql.removeEventListener === 'function') {
        mql.removeEventListener('change', handleChange);
      } else if (typeof mql.removeListener === 'function') {
        mql.removeListener(handleChange);
      }
    }

    window.removeEventListener('resize', handleChange);
    window.removeEventListener('orientationchange', handleChange);
    visualViewport?.removeEventListener('resize', handleChange);
  };
}

function getServerSnapshot() {
  return false;
}

export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
