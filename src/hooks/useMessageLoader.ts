import { useState, useEffect, useCallback } from "react";
import { MessageReceivedEvent } from "types/events";
import { VisitedRoom } from "types";
import { getMessages, messageToEvent } from "services/db";
import { notifyError } from "services/notifications";

const MESSAGES_PER_PAGE = 20;

interface UseMessageLoaderProps {
  ticket: VisitedRoom | undefined;
}

export function useMessageLoader({ ticket }: UseMessageLoaderProps) {
  const [dbMessages, setDbMessages] = useState<MessageReceivedEvent[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreOldMessages, setHasMoreOldMessages] = useState(true);

  // Effect to load initial messages and reset state when ticket changes
  useEffect(() => {
    if (!ticket) {
      setDbMessages([]); // Clear messages if no ticket
      return;
    }

    // Reset state for new ticket
    setDbMessages([]);
    setCurrentPage(1);
    setIsLoadingMore(false); // Will be set true by loadInitialMessages
    setHasMoreOldMessages(true);

    const loadInitialMessages = async () => {
      setIsLoadingMore(true);
      try {
        const persisted = await getMessages(ticket.id, 1, MESSAGES_PER_PAGE);
        if (persisted.length < MESSAGES_PER_PAGE) {
          setHasMoreOldMessages(false);
        }
        const historicalMessages: MessageReceivedEvent[] =
          persisted.map(messageToEvent);
        setDbMessages(historicalMessages);
        // setCurrentPage is already 1
      } catch (error) {
        notifyError(
          `Error loading persisted messages: ${error}`,
          "loadingError"
        );
        setHasMoreOldMessages(false);
      } finally {
        setIsLoadingMore(false);
      }
    };

    loadInitialMessages();
  }, [ticket]);

  const loadMorePreviousMessages = useCallback(async () => {
    if (!ticket || isLoadingMore || !hasMoreOldMessages) return;

    setIsLoadingMore(true);
    try {
      const nextPageToFetch = currentPage + 1;
      const persisted = await getMessages(
        ticket.id,
        nextPageToFetch,
        MESSAGES_PER_PAGE
      );

      if (persisted.length === 0) {
        setHasMoreOldMessages(false);
      } else {
        const historicalMessages: MessageReceivedEvent[] =
          persisted.map(messageToEvent);
        // Prepend older messages
        setDbMessages((prevMsgs) => [...historicalMessages, ...prevMsgs]);
        setCurrentPage(nextPageToFetch);
        if (persisted.length < MESSAGES_PER_PAGE) setHasMoreOldMessages(false);
      }
    } catch (error) {
      notifyError(`Error loading more messages: ${error}`, "loadingError");
      setHasMoreOldMessages(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [ticket, isLoadingMore, hasMoreOldMessages, currentPage]);

  const addLiveMessageToDisplay = useCallback(
    (liveMessage: MessageReceivedEvent) => {
      setDbMessages((prevMsgs) => [...prevMsgs, liveMessage]);
    },
    []
  );

  return {
    dbMessages,
    loadMorePreviousMessages,
    isLoadingMore,
    hasMoreOldMessages,
    addLiveMessageToDisplay,
  };
}
