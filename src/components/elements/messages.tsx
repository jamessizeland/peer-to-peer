import React, { useState, useEffect, useRef } from "react";
import { MdSend } from "react-icons/md";
import { sendMessage, getNodeId, getNickname } from "services/ipc";
import { MessageReceivedEvent } from "types/events";

// This interface will represent any message shown in the UI,
// whether it's locally sent or received from props.
interface DisplayMessage {
  from: string; // NodeId of the sender
  text: string; // Message content
  nickname: string; // Nickname of the sender
  sentTimestamp: number; // Timestamp of when the message was sent/created
  isMine: boolean; // True if this message was sent by the current user
  displayId: string; // A unique ID for React's key prop
}

const Messages: React.FC<{ messages: MessageReceivedEvent[] }> = ({
  // `messages` prop contains messages from others
  messages: propMessages,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [myNodeId, setMyNodeId] = useState<string | null>(null);
  const [myNickname, setMyNickname] = useState<string | null>(null);

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
        setMyNodeId(nodeId);
        setMyNickname(nickname || "Me"); // Fallback nickname
      } catch (error) {
        console.error("Failed to fetch user details:", error);
        setMyNickname("Me (Error)");
      }
    };
    fetchUserDetails();
  }, []);

  // Combine and sort messages whenever propMessages or localSentMessages change
  useEffect(() => {
    const remoteDisplayMessages: DisplayMessage[] = propMessages.map((msg) => ({
      ...msg, // from, text, nickname, sentTimestamp
      isMine: false, // Messages from props are from others
      displayId: `remote-${msg.from}-${msg.sentTimestamp}-${msg.text.slice(
        0,
        5
      )}`, // Create a somewhat unique ID
    }));

    const allMessages = [...localSentMessages, ...remoteDisplayMessages];
    allMessages.sort((a, b) => a.sentTimestamp - b.sentTimestamp);
    setDisplayedMessages(allMessages);
  }, [propMessages, localSentMessages]);

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
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
        displayId: `local-${Date.now()}`, // Unique ID for local message
      };

      setLocalSentMessages((prev) => [...prev, newLocalMessage]);
      setInputValue(""); // Clear input

      try {
        await sendMessage(messageToSend);
        // Message is already displayed locally. No further action on success needed here.
      } catch (error) {
        console.error("Failed to send message via IPC:", error);
        // Optionally, provide UI feedback for send failure, e.g., remove the message or mark it as failed
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
      <MessageArea displayedMessages={displayedMessages} />
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
          //   rows={1}
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
}> = ({ displayedMessages }) => {
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  // Scroll to bottom when displayedMessages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayedMessages]);

  return (
    <div className="grow p-2 space-y-2 overflow-y-auto min-h-0">
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
            {/* Optional: Footer for sent/delivered status for "isMine" messages */}
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};
