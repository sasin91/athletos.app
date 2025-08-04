import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export default function UpdateNotification() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handleServiceWorkerUpdate = (registration: ServiceWorkerRegistration) => {
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setUpdateAvailable(true);
        }
      };

      // Listen for service worker updates
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });

      // Check for existing service worker
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          handleServiceWorkerUpdate(registration);
          
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setWaitingWorker(newWorker);
                  setUpdateAvailable(true);
                }
              });
            }
          });
        }
      });
    }
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      setUpdateAvailable(false);
    }
  };

  const handleDismiss = () => {
    setUpdateAvailable(false);
  };

  useEffect(() => {
    if (updateAvailable) {
      toast('App Update Available', {
        description: 'A new version of Athletos is ready!',
        action: {
          label: 'Update',
          onClick: handleUpdate,
        },
        duration: 10000, // 10 seconds
        onDismiss: handleDismiss,
      });
    }
  }, [updateAvailable]);

  return null; // This component doesn't render anything visible
}