import React from 'react';
import axios from 'axios';
import './ChatMessage.css';

const BASE_URL = "http://localhost:8080";

const isImage = (url) => {
    return url && /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
};

const ChatMessage = ({ msg, isMine, parentMsg, onReply }) => {

    // ================= DOWNLOAD =================
    const downloadFile = async (url) => {
        try {

            const token = localStorage.getItem("token");

            const response = await axios.get(
                `${BASE_URL}${url}`,
                {
                    responseType: "blob",
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            // Create downloadable blob
            const blob = new Blob([response.data]);

            const downloadUrl = window.URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = downloadUrl;

            // Extract filename
            const fileName = url.split("/").pop();

            link.download = fileName || "file";

            document.body.appendChild(link);

            link.click();

            link.remove();

            window.URL.revokeObjectURL(downloadUrl);

        } catch (err) {
            console.error("Download failed", err);
        }
    };

    return (
        <div className={`message-row ${isMine ? 'mine' : 'other'}`}>

            {!isMine && (
                <div className="sender-name">{msg.sender}</div>
            )}

            {/* REPLY */}
            {parentMsg && (
                <div className="reply-box">
                    <strong>{parentMsg.sender}</strong>
                    <div className="reply-text">
                        {parentMsg.content}
                    </div>
                </div>
            )}

            <div className="message-bubble">

                {/* TEXT */}
                {msg.content && (
                    <div className="message-text">
                        {msg.content}
                    </div>
                )}

                {/* FILE */}
                {msg.fileUrl && (
                    <div className="file-container">

                        {/* IMAGE */}
                        {isImage(msg.fileUrl) ? (

                            <img
                                src={`${BASE_URL}${msg.fileUrl}`}
                                className="image-preview"
                                alt="attachment"
                                onClick={() => downloadFile(msg.fileUrl)}
                            />

                        ) : (

                            <button
                                className="file-link"
                                onClick={() => downloadFile(msg.fileUrl)}
                            >
                                📎 Download File
                            </button>

                        )}

                    </div>
                )}

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