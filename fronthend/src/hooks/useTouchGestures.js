import { useEffect, useState } from 'react';

/**
 * A custom hook to handle touch gestures for mobile navigation
 * @param {object} options Configuration options
 * @param {number} options.swipeThreshold Distance in pixels to trigger a swipe action (default: 100)
 * @param {Function} options.onSwipeLeft Callback for left swipe
 * @param {Function} options.onSwipeRight Callback for right swipe
 * @param {Function} options.onSwipeDown Callback for down swipe (e.g., for refresh)
 * @returns {object} State of current gestures
 */
const useTouchGestures = ({ 
  swipeThreshold = 100,
  onSwipeLeft,
  onSwipeRight,
  onSwipeDown
}) => {
  const [touchState, setTouchState] = useState({
    startX: 0,
    startY: 0,
    isInProgress: false
  });

  useEffect(() => {
    // Skip on non-touch devices
    if (!('ontouchstart' in window)) return;
    
    const handleTouchStart = (e) => {
      const touch = e.touches[0];
      setTouchState({
        startX: touch.clientX,
        startY: touch.clientY,
        isInProgress: true
      });
    };

    const handleTouchMove = (e) => {
      if (!touchState.isInProgress) return;
      
      // Prevent default only when we detect a meaningful gesture
      // This allows normal scrolling to work
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchState.startX;
      const deltaY = touch.clientY - touchState.startY;
      
      if (Math.abs(deltaX) > 30 || Math.abs(deltaY) > 30) {
        // Prevent default when detecting significant movement
        // to avoid browser's native gesture handling
        e.preventDefault();
      }
    };

    const handleTouchEnd = (e) => {
      if (!touchState.isInProgress) return;
      
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchState.startX;
      const deltaY = touch.clientY - touchState.startY;
      
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (Math.abs(deltaX) >= swipeThreshold) {
          if (deltaX > 0 && onSwipeRight) {
            onSwipeRight();
          } else if (deltaX < 0 && onSwipeLeft) {
            onSwipeLeft();
          }
        }
      } else {
        // Vertical swipe
        if (deltaY > swipeThreshold && onSwipeDown) {
          onSwipeDown();
        }
      }
      
      setTouchState({ startX: 0, startY: 0, isInProgress: false });
    };

    // Add passive: false to be able to prevent default behavior when needed
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [touchState.isInProgress, touchState.startX, touchState.startY, onSwipeLeft, onSwipeRight, onSwipeDown, swipeThreshold]);

  return touchState;
};

export default useTouchGestures; 