import { useRef, useLayoutEffect } from "react";

interface UseScrollToBottomOptions {
  /** Ref to the scrollable container element. */
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  /** Ref to the element at the end of the list to scroll into view. */
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  /** The current count of items in the list. Used to detect new items. */
  currentItemsCount: number;
  /** Boolean indicating if scroll is currently being adjusted by another process (e.g., infinite scroll). */
  isAdjustingScroll: boolean;
  /** Boolean indicating if more items are currently being loaded (e.g., older items for infinite scroll). */
  isLoadingMore: boolean;
  /** Pixel distance from the bottom to consider the user "near the bottom". */
  bottomThreshold?: number;
}

/**
 * Custom hook to automatically scroll to the bottom of a list
 * when new items are added or on initial load, if the user is near the bottom.
 */
export function useScrollToBottom({
  scrollContainerRef,
  messagesEndRef,
  currentItemsCount,
  isAdjustingScroll,
  isLoadingMore,
  bottomThreshold = 150,
}: UseScrollToBottomOptions) {
  const prevItemsCountRef = useRef(0);

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !messagesEndRef.current) return;

    if (isAdjustingScroll || isLoadingMore) {
      // Don't scroll to bottom if we are adjusting for old messages or currently loading them
      return;
    }

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      bottomThreshold;

    const isInitialLoad =
      prevItemsCountRef.current === 0 && currentItemsCount > 0;

    if (isInitialLoad || isNearBottom) {
      messagesEndRef.current.scrollIntoView({
        behavior: isInitialLoad ? "auto" : "smooth",
      });
    }
    prevItemsCountRef.current = currentItemsCount;
  }, [
    scrollContainerRef,
    messagesEndRef,
    currentItemsCount,
    isAdjustingScroll,
    isLoadingMore,
    bottomThreshold,
  ]);
}
