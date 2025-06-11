import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { MdSend } from "react-icons/md";
import { addMessage, eventToMessage } from "services/db";
import {
  sendMessage,
  getNodeId,
  getNickname,
  getLatestTicket,
} from "services/ipc";
import { VisitedRoom } from "types";
import { MessageReceivedEvent } from "types/events";

interface DisplayMessage {
  /** NodeId of the sender */
  from: string;
  /** Message content */
  text: string;
  /** Nickname of the sender */
  nickname: string;
  /** Timestamp of when the message was sent/created */
  sentTimestamp: number;
  /** True if this message was sent by the current user */
  isMine: boolean;
  /** Unique ID for React's key prop */
  displayId: string;
}

interface MessageProps {
  /** Messages from the database (historical and live) */
  dbMessages: MessageReceivedEvent[];
  /** Function to load more older messages */
  onLoadMore: () => Promise<void>;
  /** True if currently loading older messages */
  isLoadingMore: boolean;
  /** True if there are more older messages to load */
  hasMoreOldMessages: boolean;
}

const SCROLL_TOP_THRESHOLD = 10; // pixels

const Messages: React.FC<MessageProps> = ({
  dbMessages,
  onLoadMore,
  isLoadingMore,
  hasMoreOldMessages,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [myNodeId, setMyNodeId] = useState<string | null>(null);
  const [myNickname, setMyNickname] = useState<string | null>(null);
  const [ticket, setTicket] = useState<VisitedRoom | null>(null);

  // Stores messages sent by the current user locally
  const [localSentMessages, setLocalSentMessages] = useState<DisplayMessage[]>(
    []
  );
  // Stores all messages (local and from props) sorted for display
  const [displayedMessages, setDisplayedMessages] = useState<DisplayMessage[]>(
    []
  );

  // Fetch current user's nodeId and nickname on mount
  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const nodeId = await getNodeId();
        const nickname = await getNickname();
        const ticket = await getLatestTicket();
        setMyNodeId(nodeId);
        setMyNickname(nickname || "Me"); // Fallback nickname
        setTicket(ticket);
      } catch (error) {
        console.error("Failed to fetch user details:", error);
        setMyNickname("Me (Error)");
      }
    };
    fetchUserDetails();
  }, []);

  // Combine and sort messages whenever dbMessages or localSentMessages change
  useEffect(() => {
    const remoteDisplayMessages: DisplayMessage[] = dbMessages.map((msg) => ({
      // Spread common properties from MessageReceivedEvent
      from: msg.from,
      text: msg.text,
      nickname: msg.nickname,
      sentTimestamp: msg.sentTimestamp,
      isMine: myNodeId ? msg.from === myNodeId : false, // Determine if the message is from the current user
      displayId: `remote-${msg.from}-${msg.sentTimestamp}-${msg.text.slice(
        0,
        5
      )}-${Math.random()}`,
    }));

    const allMessages = [...localSentMessages, ...remoteDisplayMessages];
    allMessages.sort((a, b) => a.sentTimestamp - b.sentTimestamp);
    setDisplayedMessages(allMessages);
  }, [dbMessages, localSentMessages, myNodeId]);

  const handleSendMessage = async (
    e: React.FormEvent<HTMLFormElement> | React.KeyboardEvent<HTMLInputElement>
  ) => {
    e.preventDefault();
    if (inputValue.trim() && myNodeId && myNickname) {
      setSubmitting(true);

      const messageToSend = inputValue.trim();
      const newLocalMessage: DisplayMessage = {
        from: myNodeId,
        text: messageToSend,
        nickname: myNickname,
        sentTimestamp: Date.now() * 1000,
        isMine: true,
        displayId: `local-${myNodeId}-${Date.now()}-${Math.random()}`, // Unique ID for local message
      };
      const newDBMessage: MessageReceivedEvent = {
        type: "messageReceived",
        from: myNodeId,
        nickname: myNickname,
        text: messageToSend,
        sentTimestamp: Date.now() * 1000,
      };

      setLocalSentMessages((prev) => [...prev, newLocalMessage]);
      setInputValue(""); // Clear input

      try {
        if (ticket) await addMessage(eventToMessage(newDBMessage, ticket));
        await sendMessage(messageToSend);
        // Message is already displayed locally. No further action on success needed here.
      } catch (error) {
        console.error("Failed to send message via IPC:", error);
        setLocalSentMessages((prev) =>
          prev.filter((msg) => msg.displayId !== newLocalMessage.displayId)
        );
        // alert("Failed to send message. Please try again.");
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full min-h-0">
      <MessageArea
        displayedMessages={displayedMessages}
        onLoadMore={onLoadMore}
        isLoadingMore={isLoadingMore}
        hasMoreOldMessages={hasMoreOldMessages}
      />
      <form
        className="flex flex-row space-x-2 p-2 border-t border-base-300"
        onSubmit={handleSendMessage}
      >
        <input
          className="textarea textarea-bordered textarea-accent w-full resize-none"
          placeholder="Message"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!submitting && inputValue.trim()) {
                handleSendMessage(e as any); // Cast for simplicity
              }
            }
          }}
          required
        />
        <button
          disabled={!inputValue.trim() || submitting}
          type="submit"
          className="btn btn-accent h-auto"
        >
          <MdSend />
        </button>
      </form>
    </div>
  );
};

export default Messages;

const MessageArea: React.FC<{
  displayedMessages: DisplayMessage[];
  onLoadMore: () => Promise<void>;
  isLoadingMore: boolean;
  hasMoreOldMessages: boolean;
}> = ({ displayedMessages, onLoadMore, isLoadingMore, hasMoreOldMessages }) => {
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const scrollContainerRef = useRef<null | HTMLDivElement>(null);
  const oldScrollHeightRef = useRef<number>(0);
  const [isAdjustingScroll, setIsAdjustingScroll] = useState(false);
  const prevDisplayedMessagesLengthRef = useRef(0);

  // Detect scroll to top to load more messages
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      if (
        container.scrollTop < SCROLL_TOP_THRESHOLD && // check if near top
        hasMoreOldMessages && // more messages are available to load
        !isLoadingMore && // not already loading from props
        !isAdjustingScroll // not currently in the process of adjusting scroll
      ) {
        oldScrollHeightRef.current = container.scrollHeight;
        setIsAdjustingScroll(true); // signal that we are about to load and will need to adjust
        onLoadMore();
      }
    };
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [hasMoreOldMessages, isLoadingMore, onLoadMore, isAdjustingScroll]);

  // Adjust scroll position, after older messages are loaded, and prepend.
  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (isAdjustingScroll && !isLoadingMore) {
      // isLoadingMore is now false, meaning ChatPage finished loading
      const newScrollHeight = container.scrollHeight;
      // only adjust if new messages were actually loaded
      if (newScrollHeight > oldScrollHeightRef.current) {
        container.scrollTop = newScrollHeight - oldScrollHeightRef.current;
      }
      setIsAdjustingScroll(false); // reset adjustment flag
    }
  }, [displayedMessages, isLoadingMore, isAdjustingScroll]);

  // Scroll to bottom for new messages or initial load
  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (isAdjustingScroll || isLoadingMore) {
      // Don't scroll to bottom if we are adjusting for old messages or currently loading them
      return;
    }
    // Heuristic: if message count increased and we're not adjusting scroll, it's likely a new message.
    // More robust: check if user was already near bottom.
    const BOTTOM_THRESHOLD = 150; // pixels
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      BOTTOM_THRESHOLD;
    const isInitialLoad =
      prevDisplayedMessagesLengthRef.current === 0 &&
      displayedMessages.length > 0;
    if ((isInitialLoad || isNearBottom) && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: isInitialLoad ? "auto" : "smooth",
      });
    }
    prevDisplayedMessagesLengthRef.current = displayedMessages.length;
  }, [displayedMessages, isAdjustingScroll, isLoadingMore]);

  return (
    <div
      ref={scrollContainerRef}
      className="grow p-2 space-y-2 overflow-y-auto min-h-0"
    >
      {isLoadingMore && displayedMessages.length > 0 && (
        <div className="text-center text-sm text-gray-500 py-2">
          Loading older messages...
        </div>
      )}
      {displayedMessages.map((message) => {
        const chatAlignment = message.isMine ? "chat-end" : "chat-start";

        return (
          <div key={message.displayId} className={`chat ${chatAlignment}`}>
            <div className="chat-header">
              {!message.isMine && (
                <span className="mr-1 text-sm font-semibold">
                  {message.nickname}
                </span>
              )}
              <time className="text-xs opacity-50">
                {new Date(message.sentTimestamp / 1000).toLocaleString()}
              </time>
            </div>
            <div className="chat-bubble">{message.text}</div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};
