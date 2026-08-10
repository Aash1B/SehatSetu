import React from 'react';
import { Trash2, Settings, X } from 'lucide-react';

interface ChatSettingsProps {
  onClose: () => void;
  onClearChat: () => void;
  onSendOnEnter?: (enabled: boolean) => void;
  sendOnEnter: boolean;
}

const ChatSettings: React.FC<ChatSettingsProps> = ({
  onClose,
  onClearChat,
  onSendOnEnter,
  sendOnEnter,
}) => {
  return (
    <div className="chat-settings-backdrop" onClick={onClose}>
      <div
        className="chat-settings-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Chat settings"
      >
        <div className="chat-settings-header">
          <h3 className="chat-settings-title">
            <Settings className="w-5 h-5" />
            Chat Settings
          </h3>
          <button
            className="chat-settings-close"
            onClick={onClose}
            type="button"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="chat-settings-section">
          <label className="chat-setting-row">
            <span className="chat-setting-label">Send on Enter</span>
            <button
              className={`chat-toggle ${sendOnEnter ? 'chat-toggle-on' : 'chat-toggle-off'}`}
              onClick={() => onSendOnEnter?.(!sendOnEnter)}
              type="button"
              role="switch"
              aria-checked={sendOnEnter}
            >
              <span
                className={`chat-toggle-thumb ${sendOnEnter ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </label>
        </div>

        <div className="chat-settings-section">
          <button
            className="chat-setting-btn chat-setting-btn-danger"
            onClick={onClearChat}
            type="button"
          >
            <Trash2 className="w-4 h-4" />
            Clear conversation
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatSettings;
