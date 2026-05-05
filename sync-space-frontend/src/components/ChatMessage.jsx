import React from 'react';
import './ChatMessage.css';

const ChatMessage = ({ msg, isMine, parentMsg, onReply }) => {
    return (
        <div className={`message-row ${isMine ? 'mine' : 'other'}`}>

            {!isMine && (
                <div className="sender-name">{msg.sender}</div>
            )}

            {/* 🔥 REPLY BOX */}
            {parentMsg && (
                <div className="reply-box">
                    <strong>{parentMsg.sender}</strong>
                    <div className="reply-text">
                        {parentMsg.content}
                    </div>
                </div>
            )}

            <div className="message-bubble">
                {msg.content}
                <div className="timestamp">
                    {new Date(msg.createdAt).toLocaleTimeString()}
                </div>
            </div>

            <button className="reply-btn" onClick={onReply}>
                Reply
            </button>

        </div>
    );
};

export default ChatMessage;