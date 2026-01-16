import React, { useState } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { FiMic, FiMicOff, FiVolume2 } from 'react-icons/fi';

interface VoiceAssistantProps {
  onTranscript: (text: string) => void;
  onResponse?: (response: string) => void;
  applicationId?: string;
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
  onTranscript,
  onResponse,
  applicationId,
}) => {
  const { transcript, isListening, isSupported, startListening, stopListening } =
    useSpeechRecognition();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleVoiceCommand = async () => {
    if (!isListening) {
      startListening();
    } else {
      stopListening();
      if (transcript && applicationId) {
        setIsProcessing(true);
        onTranscript(transcript);
        try {
          // API call would happen here
          onResponse?.('Processing your command...');
        } finally {
          setIsProcessing(false);
        }
      }
    }
  };

  if (!isSupported) {
    return (
      <div className="voice-assistant-unsupported">
        <p>Voice commands not supported in your browser</p>
      </div>
    );
  }

  return (
    <div className="voice-assistant">
      <button
        onClick={handleVoiceCommand}
        className={`voice-btn ${isListening ? 'active' : ''}`}
        disabled={isProcessing}
      >
        {isListening ? (
          <FiMicOff size={24} />
        ) : (
          <FiMic size={24} />
        )}
      </button>

      {transcript && (
        <div className="transcript-display">
          <p className="transcript-label">You said:</p>
          <p className="transcript-text">{transcript}</p>
        </div>
      )}

      {isProcessing && (
        <div className="processing">
          <FiVolume2 className="spinner" size={20} />
          <p>Processing response...</p>
        </div>
      )}
    </div>
  );
};
