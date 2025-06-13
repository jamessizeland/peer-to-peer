import React, { useState, useEffect, useRef } from "react";
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
import { useInfiniteScroll } from "hooks/useInfiniteScroll";
import { useScrollToBottom } from "hooks/useScrollToBottom";

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
  /** Flag for it any peers are online */
  peersOnline: boolean;
}

const SCROLL_TOP_THRESHOLD = 50; // pixels

const Messages: React.FC<MessageProps> = ({
  dbMessages,
  onLoadMore,
  isLoadingMore,
  hasMoreOldMessages,
  peersOnline,
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
      displayId: `remote-${msg.from}-${msg.sentTimestamp}`,
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
      const sentTimestamp = Date.now() * 1000;
      const newLocalMessage: DisplayMessage = {
        from: myNodeId,
        text: messageToSend,
        nickname: myNickname,
        sentTimestamp,
        isMine: true,
        displayId: `local-${myNodeId}-${sentTimestamp}`, // Unique ID for local message
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
        className="flex flex-row space-x-2 p-2 border-t border-base-300 bg-blue-950"
        onSubmit={handleSendMessage}
      >
        <input
          className="textarea textarea-bordered textarea-info w-full resize-none"
          placeholder={peersOnline ? "Message" : "No peers online"}
          disabled={!peersOnline}
          type="text"
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
          disabled={!inputValue.trim() || submitting || !peersOnline}
          type="submit"
          className="btn btn-primary h-auto"
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
  const { isAdjustingScroll } = useInfiniteScroll({
    scrollContainerRef,
    onLoadMore,
    isLoading: isLoadingMore,
    hasMore: hasMoreOldMessages,
    dependenciesForPreservationEffect: [displayedMessages],
    scrollTopThreshold: SCROLL_TOP_THRESHOLD,
    // scrollDebounceDelay: 200, // Default
    // scrollPreservationDelay: 50, // Default
  });

  useScrollToBottom({
    scrollContainerRef,
    messagesEndRef,
    currentItemsCount: displayedMessages.length,
    isAdjustingScroll,
    isLoadingMore,
    // bottomThreshold: 150, // Default
  });

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
      {!hasMoreOldMessages && (
        <div className="text-center text-sm text-yellow-500 py-2 px-4">
          Messages are end-to-end encrypted and sent to all online peers
          directly following the{" "}
          <a
            target="_blank"
            className="link link-info"
            href="https://www.iroh.computer/proto/iroh-gossip"
          >
            gossip protocol
          </a>
          . Received messages are stored locally on your device - and sent
          messages will only arrive at online peers, there is no catch-up sync.
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
            <div className="chat-bubble wrap-anywhere">{message.text}</div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};
