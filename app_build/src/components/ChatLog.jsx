import React, { useEffect, useRef } from 'react';

/**
 * ChatLog — Scrolling text log displaying game narrative.
 * Messages are color-coded by type.
 */
export default function ChatLog({ messages }) {
  const bottomRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getTypeClass = (type) => {
    switch (type) {
      case 'narrative': return 'msg-narrative';
      case 'system':    return 'msg-system';
      case 'danger':    return 'msg-danger';
      case 'warning':   return 'msg-warning';
      case 'loot':      return 'msg-loot';
      case 'dialogue':  return 'msg-dialogue';
      case 'hint':      return 'msg-hint';
      case 'scream':    return 'msg-scream';
      case 'player':    return 'msg-player';
      default:          return 'msg-system';
    }
  };

  return (
    <div className="chat-log" ref={containerRef}>
      {messages.map((msg, idx) => (
        <div
          key={idx}
          className={`chat-message ${getTypeClass(msg.type)} chat-message-enter`}
          style={{ animationDelay: `${Math.min(idx * 0.02, 0.3)}s` }}
        >
          {msg.type === 'player' && <span className="prompt-caret">&gt; </span>}
          <span className="msg-text">{msg.text}</span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
