import React, { useState, useEffect, useRef } from "react";
import { MdSend } from "react-icons/md";
import { addMessage, buildMessage } from "services/db";
import {
  sendMessage,
  getNodeId,
  getNickname,
  getLatestTicket,
} from "services/ipc";
import { VisitedRoom } from "types";
import { MessageReceivedEvent } from "types/events";

interface DisplayMessage {
  from: string; // NodeId of the sender
  text: string; // Message content
  nickname: string; // Nickname of the sender
  sentTimestamp: number; // Timestamp of when the message was sent/created
  isMine: boolean; // True if this message was sent by the current user
  displayId: string; // A unique ID for React's key prop
}

const Messages: React.FC<{ messages: MessageReceivedEvent[] }> = ({
  messages: propMessages,
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

  // Combine and sort messages whenever propMessages or localSentMessages change
  useEffect(() => {
    const remoteDisplayMessages: DisplayMessage[] = propMessages.map((msg) => ({
      // Spread common properties from MessageReceivedEvent
      from: msg.from,
      text: msg.text,
      nickname: msg.nickname,
      sentTimestamp: msg.sentTimestamp,
      isMine: myNodeId ? msg.from === myNodeId : false, // Determine if the message is from the current user
      displayId: `remote-${msg.from}-${msg.sentTimestamp}-${msg.text.slice(
        0,
        5
      )}`,
    }));

    const allMessages = [...localSentMessages, ...remoteDisplayMessages];
    allMessages.sort((a, b) => a.sentTimestamp - b.sentTimestamp);
    setDisplayedMessages(allMessages);
  }, [propMessages, localSentMessages, myNodeId]);

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
        if (ticket) await addMessage(buildMessage(newDBMessage, ticket));
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
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};
