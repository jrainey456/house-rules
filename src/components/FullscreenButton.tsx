'use client';

import { useEffect, useState } from 'react';
import { fullscreenManager } from '../lib/fullscreen';

interface FullscreenButtonProps {
  /** Additional CSS styles for the button */
  style?: React.CSSProperties;
  /** Custom class name */
  className?: string;
  /** Position the button (default: 'top-right') */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'inline';
  /** Custom text for enter fullscreen (default: '⛶') */
  enterText?: string;
  /** Custom text for exit fullscreen (default: '⊡') */
  exitText?: string;
  /** Show text labels instead of icons */
  showText?: boolean;
  /** Callback when fullscreen state changes */
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

const defaultPositionStyles: Record<string, React.CSSProperties> = {
  'top-right': {
    position: 'fixed',
    top: '1rem',
    right: '1rem',
    zIndex: 9999,
  },
  'top-left': {
    position: 'fixed',
    top: '1rem',
    left: '1rem',
    zIndex: 9999,
  },
  'bottom-right': {
    position: 'fixed',
    bottom: '1rem',
    right: '1rem',
    zIndex: 9999,
  },
  'bottom-left': {
    position: 'fixed',
    bottom: '1rem',
    left: '1rem',
    zIndex: 9999,
  },
  'inline': {},
};

export default function FullscreenButton({
  style = {},
  className = '',
  position = 'top-right',
  enterText = '⛶',
  exitText = '⊡',
  showText = false,
  onFullscreenChange
}: FullscreenButtonProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    // Check support and initial state
    setIsSupported(fullscreenManager.isSupported());
    setIsFullscreen(fullscreenManager.isFullscreen());


    // Listen for fullscreen changes
    const unsubscribe = fullscreenManager.addListener((fullscreen: boolean) => {
      setIsFullscreen(fullscreen);
      onFullscreenChange?.(fullscreen);
    });

    return unsubscribe;
  }, [onFullscreenChange]);

  const handleToggle = async () => {
    if (isToggling) return;

    setIsToggling(true);
    try {
      await fullscreenManager.toggleFullscreen();
    } catch (error) {
      console.error('Failed to toggle fullscreen:', error);
    } finally {
      setIsToggling(false);
    }
  };

  // Don't render if not supported
  if (!isSupported) {
    return null;
  }

  const baseStyle: React.CSSProperties = {
    fontFamily: 'var(--font-special-elite), serif',
    fontSize: showText ? '1rem' : '1.5rem',
    padding: showText ? '0.5rem 1rem' : '0.5rem',
    background: 'rgba(0, 0, 0, 0.7)',
    color: '#e8e0d0',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '8px',
    cursor: isToggling ? 'not-allowed' : 'pointer',
    userSelect: 'none',
    touchAction: 'manipulation',
    opacity: isToggling ? 0.5 : 1,
    transition: 'all 0.2s ease',
    // Mobile-friendly touch target
    minWidth: '44px',
    minHeight: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    // Prevent text selection
    WebkitUserSelect: 'none',
    MozUserSelect: 'none',
    msUserSelect: 'none',
    // Better button behavior on mobile
    WebkitTapHighlightColor: 'transparent',
    ...defaultPositionStyles[position],
    ...style,
  };

  const getButtonText = () => {
    if (showText) {
      return isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen';
    }
    return isFullscreen ? exitText : enterText;
  };

  const getAriaLabel = () => {
    return isFullscreen ? 'Exit fullscreen mode' : 'Enter fullscreen mode';
  };

  return (
    <button
      type="button"
      style={baseStyle}
      className={className}
      onClick={handleToggle}
      disabled={isToggling}
      aria-label={getAriaLabel()}
      title={getAriaLabel()}
    >
      {getButtonText()}
    </button>
  );
}