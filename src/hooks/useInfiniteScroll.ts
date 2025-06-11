import { useState, useRef, useEffect, useLayoutEffect } from "react";

interface UseInfiniteScrollOptions {
  /** Ref to the scrollable container element. */
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  /** Callback function to fetch more items. */
  onLoadMore: () => Promise<void>;
  /** Boolean indicating if more items are currently being loaded. */
  isLoading: boolean;
  /** Boolean indicating if there are more items to load. */
  hasMore: boolean;
  /** Dependencies that trigger the scroll preservation effect (e.g., the array of displayed items). */
  dependenciesForPreservationEffect: any[];
  /** Pixel distance from the top to trigger loading more. */
  scrollTopThreshold?: number;
  /** Delay in milliseconds for debouncing the scroll event. */
  scrollDebounceDelay?: number;
  /** Delay in milliseconds before resetting the scroll adjustment flag. */
  scrollPreservationDelay?: number;
}

/**
 * Custom hook to manage infinite scrolling from the top of a container,
 * including scroll position preservation when new items are prepended.
 */
export function useInfiniteScroll({
  scrollContainerRef,
  onLoadMore,
  isLoading,
  hasMore,
  dependenciesForPreservationEffect,
  scrollTopThreshold = 50,
  scrollDebounceDelay = 200,
  scrollPreservationDelay = 50,
}: UseInfiniteScrollOptions) {
  const [isAdjustingScroll, setIsAdjustingScroll] = useState(false);
  const oldScrollHeightRef = useRef<number>(0);

  // Effect for detecting scroll to top and triggering load more
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let timerId: NodeJS.Timeout | null = null;
    const handleScroll = () => {
      if (container.scrollTop < scrollTopThreshold) {
        if (timerId) clearTimeout(timerId);
        timerId = setTimeout(() => {
          if (
            container.scrollTop < scrollTopThreshold &&
            hasMore &&
            !isLoading &&
            !isAdjustingScroll
          ) {
            oldScrollHeightRef.current = container.scrollHeight;
            setIsAdjustingScroll(true);
            onLoadMore();
          }
        }, scrollDebounceDelay);
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (timerId) clearTimeout(timerId);
    };
  }, [
    scrollContainerRef,
    onLoadMore,
    isLoading,
    hasMore,
    isAdjustingScroll,
    scrollTopThreshold,
    scrollDebounceDelay,
  ]);

  // Effect for adjusting scroll position after older messages are loaded
  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (isAdjustingScroll && !isLoading) {
      const newScrollHeight = container.scrollHeight;
      if (newScrollHeight > oldScrollHeightRef.current) {
        container.scrollTop = newScrollHeight - oldScrollHeightRef.current;
      }
      const timerId = setTimeout(() => {
        setIsAdjustingScroll(false);
      }, scrollPreservationDelay);
      return () => clearTimeout(timerId);
    }
  }, [
    scrollContainerRef,
    dependenciesForPreservationEffect,
    isLoading,
    isAdjustingScroll,
    scrollPreservationDelay,
    oldScrollHeightRef, // Added oldScrollHeightRef as it's read here
  ]);

  return { isAdjustingScroll };
}
