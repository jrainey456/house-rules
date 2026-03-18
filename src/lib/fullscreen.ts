/**
 * Fullscreen and Wake Lock utilities for mobile-friendly immersive experience
 */

// Type for Wake Lock Sentinel when not available in TypeScript
interface CustomWakeLockSentinel {
  release: () => Promise<void>;
  released: boolean;
  type: 'screen';
}

class FullscreenManager {
  private wakeLock: CustomWakeLockSentinel | null = null;
  private listeners: ((isFullscreen: boolean) => void)[] = [];

  constructor() {
    // Listen for fullscreen changes
    if (typeof document !== 'undefined') {
      const events = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
      events.forEach(event => {
        document.addEventListener(event, this.handleFullscreenChange.bind(this));
      });

      // Re-acquire wake lock when page becomes visible again
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.isFullscreen() && !this.wakeLock?.released) {
          this.requestWakeLock();
        }
      });
    }
  }

  private handleFullscreenChange() {
    const isFullscreen = this.isFullscreen();
    this.listeners.forEach(listener => listener(isFullscreen));
    
    if (isFullscreen) {
      this.requestWakeLock();
    } else {
      this.releaseWakeLock();
    }
  }

  /**
   * Check if currently in fullscreen mode
   */
  isFullscreen(): boolean {
    if (typeof document === 'undefined') return false;
    
    return !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );
  }

  /**
   * Request fullscreen mode
   */
  async requestFullscreen(element?: HTMLElement): Promise<boolean> {
    if (typeof document === 'undefined') return false;
    
    const elem = element || document.documentElement;
    
    try {
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        await (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).mozRequestFullScreen) {
        await (elem as any).mozRequestFullScreen();
      } else if ((elem as any).msRequestFullscreen) {
        await (elem as any).msRequestFullscreen();
      } else {
        console.warn('Fullscreen API not supported');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Failed to enter fullscreen:', error);
      return false;
    }
  }

  /**
   * Exit fullscreen mode
   */
  async exitFullscreen(): Promise<boolean> {
    if (typeof document === 'undefined') return false;
    
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      } else {
        console.warn('Exit fullscreen API not supported');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Failed to exit fullscreen:', error);
      return false;
    }
  }

  /**
   * Toggle fullscreen mode
   */
  async toggleFullscreen(element?: HTMLElement): Promise<boolean> {
    if (this.isFullscreen()) {
      return await this.exitFullscreen();
    } else {
      return await this.requestFullscreen(element);
    }
  }

  /**
   * Request wake lock to keep screen alive
   */
  async requestWakeLock(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      console.warn('Wake Lock API not supported');
      return false;
    }

    try {
      // Release existing wake lock first
      await this.releaseWakeLock();
      
      this.wakeLock = await (navigator as any).wakeLock.request('screen') as CustomWakeLockSentinel;
      return true;
    } catch (error) {
      console.error('Failed to acquire wake lock:', error);
      return false;
    }
  }

  /**
   * Release wake lock
   */
  async releaseWakeLock(): Promise<void> {
    if (this.wakeLock && !this.wakeLock.released) {
      try {
        await this.wakeLock.release();
      } catch (error) {
        console.error('Failed to release wake lock:', error);
      }
    }
    this.wakeLock = null;
  }

  /**
   * Check if wake lock is currently active
   */
  hasWakeLock(): boolean {
    return this.wakeLock !== null && !this.wakeLock.released;
  }

  /**
   * Add listener for fullscreen changes
   */
  addListener(listener: (isFullscreen: boolean) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Check if fullscreen is supported
   */
  isSupported(): boolean {
    if (typeof document === 'undefined') return false;
    
    const elem = document.documentElement;
    return !!(
      elem.requestFullscreen ||
      (elem as any).webkitRequestFullscreen ||
      (elem as any).mozRequestFullScreen ||
      (elem as any).msRequestFullscreen
    );
  }

  /**
   * Check if wake lock is supported
   */
  isWakeLockSupported(): boolean {
    return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  }
}

// Export singleton instance
export const fullscreenManager = new FullscreenManager();

// Export utility functions for convenience
export const {
  isFullscreen,
  requestFullscreen,
  exitFullscreen,
  toggleFullscreen,
  requestWakeLock,
  releaseWakeLock,
  hasWakeLock,
  addListener,
  isSupported: isFullscreenSupported,
  isWakeLockSupported
} = fullscreenManager;