import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook do debounce'owania wartości
 * @param {any} value - wartość do debounce'owania
 * @param {number} delay - opóźnienie w ms
 * @returns {any} - zdebounce'owana wartość
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook do debounce'owania funkcji callback
 * @param {Function} callback - funkcja do debounce'owania
 * @param {number} delay - opóźnienie w ms
 * @returns {Function} - zdebounce'owana funkcja
 */
export function useDebouncedCallback(callback, delay = 300) {
  const timeoutRef = useRef(null);

  const debouncedCallback = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * Hook do throttle'owania funkcji callback
 * @param {Function} callback - funkcja do throttle'owania
 * @param {number} delay - opóźnienie w ms
 * @returns {Function} - throttle'owana funkcja
 */
export function useThrottledCallback(callback, delay = 300) {
  const lastCallRef = useRef(0);
  const timeoutRef = useRef(null);

  const throttledCallback = useCallback((...args) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallRef.current;

    if (timeSinceLastCall >= delay) {
      lastCallRef.current = now;
      callback(...args);
    } else {
      // Schedule trailing call
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        lastCallRef.current = Date.now();
        callback(...args);
      }, delay - timeSinceLastCall);
    }
  }, [callback, delay]);

  return throttledCallback;
}

export default useDebounce;

