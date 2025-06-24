/**
 * Utility for adding passive event listeners to improve scrolling performance
 */

export function addPassiveEventListener(
  element: HTMLElement | Window,
  event: string,
  handler: EventListener,
  options?: AddEventListenerOptions
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
  const touchEvents = ['touchstart', 'touchmove', 'wheel'] as const;
  
  touchEvents.forEach(eventName => {
    document.addEventListener(eventName, () => {}, { passive: true });
  });
}