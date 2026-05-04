import React from 'react';
import './ChatMessage.css';

const ChatMessage = ({ msg, isMine }) => {
    return (
        <div className={`message-row ${isMine ? 'mine' : 'other'}`}>
            
            {/* Show sender name ONLY for others (optional) */}
            {!isMine && (
                <div className="sender-name">{msg.sender}</div>
            )}

            <div className="message-bubble">
                {msg.content}
            </div>

        </div>
    );
};

export default ChatMessage;