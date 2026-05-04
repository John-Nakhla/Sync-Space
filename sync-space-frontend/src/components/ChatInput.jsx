import React, { useState } from 'react';

const ChatInput = ({ onSendMessage }) => {
    const [text, setText] = useState('');

    const handleSend = () => {
        if (text.trim()) {
            onSendMessage(text);
            setText('');
        }
    };

    return (
        <div className="chat-bar">
            <input 
                value={text} 
                onChange={(e) => setText(e.target.value)}
                placeholder="Share your big ideas..."
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <button className="send-btn" onClick={handleSend}>
                Send
            </button>
        </div>
    );
};

export default ChatInput;