import React, { useState, useRef } from 'react';
import axios from 'axios';
import api from '../api/api';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

  .chat-wrapper {
    width: 100%;
    display: flex;
  }

  .chat-bar {
    width: 100%;
    background: #18181c;
    border: 1px solid #2a2a32;
    border-radius: 20px;
    padding: 12px 12px 12px 18px;
    display: flex;
    align-items: flex-end;
    gap: 10px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03) inset;
    transition: border-color 0.2s, box-shadow 0.2s;
    box-sizing: border-box;
  }

  .chat-bar:focus-within {
    border-color: #5b5bd6;
    box-shadow: 0 8px 40px rgba(0,0,0,0.5), 0 0 0 3px rgba(91,91,214,0.15);
  }

  .chat-bar.drag-over {
    border-color: #5b5bd6;
    background: rgba(91,91,214,0.05);
  }

  .chat-input-area {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .chat-text-input {
    background: transparent;
    border: none;
    outline: none;
    color: #e8e8f0;
    font-family: 'DM Sans', sans-serif;
    font-size: 15px;
    font-weight: 400;
    line-height: 1.5;
    resize: none;
    min-height: 24px;
    max-height: 120px;
    width: 100%;
    caret-color: #5b5bd6;
    box-sizing: border-box;
  }

  .chat-text-input::placeholder {
    color: #44444f;
  }

  .chat-file-strip {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .chat-file-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    padding: 5px 10px;
    border-radius: 8px;
    border: 1px dashed #2e2e3a;
    color: #55556a;
    font-size: 12px;
    font-weight: 500;
    font-family: 'DM Mono', monospace;
    letter-spacing: 0.02em;
    transition: border-color 0.2s, color 0.2s, background 0.2s;
    user-select: none;
    white-space: nowrap;
  }

  .chat-file-label:hover {
    border-color: #5b5bd6;
    color: #8080e8;
    background: rgba(91,91,214,0.07);
  }

  .chat-file-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(91,91,214,0.12);
    border: 1px solid rgba(91,91,214,0.3);
    border-radius: 20px;
    padding: 3px 8px 3px 10px;
    font-size: 12px;
    color: #9898e8;
    font-family: 'DM Mono', monospace;
    max-width: 220px;
  }

  .chat-file-pill-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 150px;
  }

  .chat-file-pill-remove {
    background: none;
    border: none;
    cursor: pointer;
    color: #6060b0;
    padding: 0;
    display: flex;
    align-items: center;
    transition: color 0.15s;
    flex-shrink: 0;
    line-height: 1;
  }

  .chat-file-pill-remove:hover {
    color: #ff6b6b;
  }

  .chat-controls {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    align-self: flex-end;
  }

  .chat-send-btn {
    background: #5b5bd6;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
    flex-shrink: 0;
    box-shadow: 0 2px 12px rgba(91,91,214,0.4);
  }

  .chat-send-btn:hover {
    background: #6e6edf;
    transform: scale(1.06);
    box-shadow: 0 4px 18px rgba(91,91,214,0.55);
  }

  .chat-send-btn:active {
    transform: scale(0.96);
  }

  .chat-send-btn:disabled {
    background: #2a2a35;
    box-shadow: none;
    cursor: not-allowed;
    transform: none;
  }

  .chat-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,0.2);
    border-top-color: #fff;
    border-radius: 50%;
    animation: chatSpin 0.7s linear infinite;
  }

  @keyframes chatSpin {
    to { transform: rotate(360deg); }
  }
`;

const PaperclipIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
  </svg>
);

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const ChatInput = ({ onSendMessage , disabled ,replyTo,onCancelReply}) => {
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const autoGrow = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  const attachFile = (f) => setFile(f);

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadFile = async (f) => {
    const formData = new FormData();
    formData.append('file', f);
    const res = await api.post('/api/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.fileUrl;
};

  const handleSend = async () => {
    if (!text.trim() && !file) return;
    setUploading(true);
    let fileUrl = null;
    try {
      if (file) fileUrl = await uploadFile(file);
      onSendMessage({ content: text, fileUrl });
      setText('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setUploading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) attachFile(f);
  };

  return (
    <>
      <style>{styles}</style>
      <div className="chat-wrapper">
        <div
          className={`chat-bar ${dragOver ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="chat-input-area">
            
            {/* Reply preview strip */}
            {replyTo && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'rgba(91,91,214,0.08)', border: '1px solid rgba(91,91,214,0.2)',
                borderRadius: '8px', padding: '6px 10px', fontSize: '12px', color: '#9898e8'
              }}>
                <span>↩ Replying to <strong>{replyTo.sender}</strong>: {replyTo.content?.slice(0, 50)}{replyTo.content?.length > 50 ? '...' : ''}</span>
                <button onClick={onCancelReply} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#6060b0', fontSize: '14px', padding: '0 0 0 8px'
                }}>✕</button>
              </div>
            )}

            <textarea
              ref={textareaRef}
              className="chat-text-input"
              value={text}
              onChange={(e) => { setText(e.target.value); autoGrow(); }}
              placeholder="Share your big ideas..."
              rows={1}
              disabled={uploading}
              onKeyDown={handleKeyDown}
            />

            <div className="chat-file-strip">
              <label className="chat-file-label" htmlFor="chat-file-input">
                <PaperclipIcon />
                Attach file
              </label>
              <input
                id="chat-file-input"
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={(e) => { if (e.target.files[0]) attachFile(e.target.files[0]); }}
                disabled={uploading}
              />

              {file && (
                <div className="chat-file-pill">
                  <span className="chat-file-pill-name">{file.name}</span>
                  <button className="chat-file-pill-remove" onClick={removeFile} title="Remove file">
                    <CloseIcon />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="chat-controls">
            <button
              className="chat-send-btn"
              onClick={handleSend}
              disabled={uploading}
              title="Send"
            >
              {uploading ? <div className="chat-spinner" /> : <SendIcon />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatInput;