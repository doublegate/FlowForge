/**
 * Utility for adding passive event listeners to improve scrolling performance
 */

export function addPassiveEventListener(
  element: HTMLElement | typeof window,
  event: string,
  handler: (e: Event) => void,
  options?: boolean | { capture?: boolean; once?: boolean; passive?: boolean }
): () => void {
  const passiveOptions = {
    ...options,
    passive: true
  };
  
  element.addEventListener(event, handler, passiveOptions);
  
  // Return cleanup function
  return () => {
    element.removeEventListener(event, handler, passiveOptions);
  };
}

// Initialize passive listeners for common events
export function initializePassiveListeners(): void {
  // Add passive touch event listeners to improve scrolling performance
  const touchEvents = ['touchstart', 'touchmove', 'wheel', 'scroll'] as const;
  
  touchEvents.forEach(eventName => {
    document.addEventListener(eventName, () => {}, { passive: true });
  });
  
  // Override addEventListener to use passive by default for touch/wheel events
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(type: string, listener: any, options?: any) {
    if (typeof type === 'string' && ['touchstart', 'touchmove', 'wheel', 'scroll'].includes(type)) {
      if (typeof options === 'object') {
        options.passive = true;
      } else if (options === undefined || typeof options === 'boolean') {
        options = { passive: true, capture: options || false };
      }
    }
    return originalAddEventListener.call(this, type, listener, options);
  };
}