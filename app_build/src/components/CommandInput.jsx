import React, { useState, useRef, useCallback } from 'react';

/**
 * CommandInput — Text input bar with command history.
 */
export default function CommandInput({ onSubmit, disabled }) {
  const [value, setValue] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef(null);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;

    onSubmit(trimmed);
    setHistory(prev => [trimmed, ...prev].slice(0, 50));
    setHistoryIndex(-1);
    setValue('');
  }, [value, onSubmit]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHistoryIndex(prev => {
        const next = Math.min(prev + 1, history.length - 1);
        if (next >= 0 && history[next]) setValue(history[next]);
        return next;
      });
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHistoryIndex(prev => {
        const next = prev - 1;
        if (next < 0) {
          setValue('');
          return -1;
        }
        if (history[next]) setValue(history[next]);
        return next;
      });
    }
  }, [history]);

  // Auto-focus on mount and after submit
  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <form className="command-input-form" onSubmit={handleSubmit}>
      <span className="command-prompt">&gt;</span>
      <input
        ref={inputRef}
        type="text"
        className="command-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter command..."
        disabled={disabled}
        autoComplete="off"
        spellCheck="false"
        autoFocus
      />
    </form>
  );
}
