/**
 * Utility for adding passive event listeners to improve scrolling performance
 */

// Type definitions for DOM APIs
type EventListenerOrEventListenerObject = EventListener | EventListenerObject;
type EventListener = (evt: Event) => void;
interface EventListenerObject {
  handleEvent(evt: Event): void;
}
interface AddEventListenerOptions {
  capture?: boolean;
  once?: boolean;
  passive?: boolean;
  signal?: AbortSignal;
}

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
  if (typeof window !== 'undefined' && window.EventTarget) {
    const originalAddEventListener = window.EventTarget.prototype.addEventListener;
    window.EventTarget.prototype.addEventListener = function(
      type: string, 
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions
    ) {
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
}