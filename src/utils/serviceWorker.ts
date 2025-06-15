/**
 * Service Worker registration and management
 * Provides offline capabilities and improved performance through caching
 */

export interface ServiceWorkerConfig {
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

/**
 * Registers the service worker if supported by the browser
 */
export async function registerServiceWorker(config: ServiceWorkerConfig = {}): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    console.log('Service workers are not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // New service worker available
            console.log('New service worker available');
            config.onUpdate?.(registration);
          } else {
            // Service worker installed for the first time
            console.log('Service worker installed');
            config.onSuccess?.(registration);
          }
        }
      });
    });

    // Check if there's an existing service worker
    if (registration.active) {
      config.onSuccess?.(registration);
    }

  } catch (error) {
    console.error('Service worker registration failed:', error);
    config.onError?.(error as Error);
  }
}

/**
 * Unregisters all service workers
 */
export async function unregisterServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(registration => registration.unregister()));
    console.log('All service workers unregistered');
  } catch (error) {
    console.error('Failed to unregister service workers:', error);
  }
}

/**
 * Updates the service worker to the new version
 */
export function updateServiceWorker(): void {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  navigator.serviceWorker.ready.then((registration) => {
    registration.update();
    
    // Tell the new service worker to skip waiting
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  });
}

/**
 * Checks if the app is running standalone (PWA mode)
 */
export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true);
}

/**
 * Checks if the browser supports PWA installation
 */
export function canInstallPWA(): boolean {
  return 'beforeinstallprompt' in window;
}
