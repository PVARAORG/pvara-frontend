import React, { useState, useRef, useEffect } from 'react';
import { FiSend, FiMessageCircle, FiDownload, FiCopy, FiMic, FiMicOff, FiVolume2, FiVolumeX } from 'react-icons/fi';
import '../styles/ai-bot.css';

interface AIBotPanelProps {
  applicationId: string;
  applicationName: string;
}

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  sources?: string[];
}

// Extend Window interface for speech recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const AIBotPanel: React.FC<AIBotPanelProps> = ({ applicationId, applicationName }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: `Hello! I'm your NOC & Licensing Assistant. I can help you with:\n\n• Questions about ${applicationName}'s evaluation\n• Analysis of documents\n• Recommendations for compliance\n• Clarification on evaluation criteria\n\nWhat would you like to know?`,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // STT (Speech-to-Text) state
  const [isListening, setIsListening] = useState(false);
  const [isSttSupported, setIsSttSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  // TTS (Text-to-Speech) state
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTtsSupported, setIsTtsSupported] = useState(false);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize Speech Recognition (STT)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSttSupported(!!SpeechRecognition);

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onend = () => setIsListening(false);

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setInputValue(prev => prev + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Initialize TTS
  useEffect(() => {
    setIsTtsSupported('speechSynthesis' in window);
  }, []);

  // TTS function to speak text
  const speakText = (text: string) => {
    if (!isTtsSupported || !isTtsEnabled) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    // Clean text for speech (remove markdown symbols)
    const cleanText = text
      .replace(/\*\*/g, '')
      .replace(/\n\n/g, '. ')
      .replace(/\n/g, '. ')
      .replace(/•/g, '')
      .replace(/\d+\./g, '');
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.lang = 'en-US';
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    speechSynthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Stop speaking
  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // Toggle listening (STT)
  const toggleListening = () => {
    if (!isSttSupported) return;
    
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
  };

  // Toggle TTS enabled/disabled
  const toggleTts = () => {
    if (isSpeaking) {
      stopSpeaking();
    }
    setIsTtsEnabled(!isTtsEnabled);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateBotResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();

    // Predefined responses based on keywords
    const responses: { [key: string]: string } = {
      'evaluation|assessment|criteria': `Based on ${applicationName}'s evaluation, here are the key assessment areas:\n\n1. **Corporate Assessment**: Business registration, incorporation documents, shareholder details\n2. **Licensing Assessment**: Regulatory compliance, permission letters from authorities\n3. **Financial Assessment**: Revenue verification, financial statements, banking relationships\n4. **Technical Assessment**: Technology infrastructure, security measures, API documentation\n5. **Compliance Assessment**: AML/KYC procedures, sanctions screening, customer verification\n6. **Data Protection**: Data handling policies, encryption standards, GDPR compliance\n7. **Risk Assessment**: Operational risks, market exposure, vendor dependencies\n8. **Pakistan Readiness**: Local regulatory compliance, Urdu documentation, local partnerships\n\nWould you like details on any specific area?`,

      'document|file|upload': `You can manage documents in the Document Management section:\n\n• **Upload**: Click "Upload Document" to add files (PDF, DOCX, XLSX, images)\n• **Version Control**: Each upload creates a new version\n• **Feedback**: Reviewers can add feedback with severity levels\n• **Track Changes**: See who made what changes and when\n• **History**: Access previous versions of documents\n\nWhat documents do you need to work with?`,

      'noc|notice of compliance|signature': `The NOC (Notice of Compliance) can be created when the application is ready:\n\n1. Navigate to the NOC Creation panel\n2. System auto-generates a license number (PVARA-NOC-YYYY-NNNNN format)\n3. Set validity dates (typically 1-5 years)\n4. Add compliance conditions\n5. Add signatories:\n   - Authorizer (usually senior official)\n   - Reviewer (compliance officer)\n   - Additional signatories as needed\n6. Download as formatted document\n7. Signatures can be added manually or digitally\n\nNeed help with any specific part?`,

      'feedback|comment|review': `The Feedback system works as follows:\n\n1. **Adding Feedback**: Go to Document Management → Select document → Add Feedback\n2. **Priority Levels**: Low, Medium, High, Critical\n3. **Categories**: Can be any heading (e.g., "KYC Procedures", "API Documentation")\n4. **Feedback Status**: Pending → Accept/Reject\n5. **Change Trail**: Track who suggested what and when\n\nFeedback helps ensure documents meet all requirements before NOC issuance.`,

      'phase|stage|workflow|process': `The NOC + Licensing Tool follows a 5-phase workflow:\n\n**Phase 1: Application Intake**\n- Application submission and initial validation\n\n**Phase 2: Comprehensive Evaluation**\n- 8-dimensional due diligence assessment\n- Document review and feedback\n\n**Phase 3: NOC Creation** (Currently Active)\n- Document finalization\n- NOC generation and signatures\n- License number assignment\n\n**Phase 4: Licensing** (Currently Locked)\n- Annual/periodic license renewal\n- Compliance updates\n\n**Phase 5: Archive**\n- Completed applications storage\n\nThe system moves applications through phases as criteria are met.`,

      'recommend|compliance|improve': `To improve ${applicationName}'s compliance status:\n\n1. **Complete All Documents**: Ensure all required documents are uploaded\n2. **Address Feedback**: Review and accept/address all feedback items\n3. **Documentation**: Provide clear, professional documentation\n4. **Signatures**: Ensure all signatories are authorized and approved\n5. **Audit Trail**: Maintain clear records of changes and approvals\n\nWould you like specific recommendations for any area?`,

      'help|how': `I can assist you with:\n\n📋 **Workflow Questions**: Phase explanations, application status\n📄 **Documents**: Upload, version control, feedback management\n📝 **NOC**: Creation process, signatures, license numbers\n📊 **Evaluation**: Assessment criteria, scoring\n🔍 **Compliance**: Best practices, recommendations\n\nJust ask your question naturally!`,

      'default': `Thank you for your question about ${applicationName}. Based on the context:\n\nI can help with:\n• The evaluation process and criteria\n• Document management and versioning\n• NOC creation and signatures\n• Compliance recommendations\n• Workflow and phase management\n\nCould you be more specific? For example: "How do I add signatures to the NOC?" or "What are the evaluation criteria?"`,
    };

    // Find matching response
    for (const [keywords, response] of Object.entries(responses)) {
      const keywordArray = keywords.split('|');
      if (keywordArray.some(kw => lowerMessage.includes(kw))) {
        return response;
      }
    }

    return responses['default'];
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Stop any ongoing speech when sending new message
    if (isSpeaking) {
      stopSpeaking();
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    const userInput = inputValue;
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Simulate bot response delay
    setTimeout(() => {
      const responseContent = generateBotResponse(userInput);
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: responseContent,
        timestamp: new Date(),
        sources: ['Evaluation Data', 'System Knowledge Base'],
      };

      setMessages(prev => [...prev, botResponse]);
      setIsLoading(false);
      
      // Speak the response if TTS is enabled
      if (isTtsEnabled) {
        speakText(responseContent);
      }
    }, 800);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const downloadConversation = () => {
    const transcript = messages
      .map(m => `[${m.type.toUpperCase()}] ${m.timestamp.toLocaleTimeString()}\n${m.content}\n`)
      .join('\n---\n\n');

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(transcript));
    element.setAttribute('download', `conversation-${applicationId}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const copyLastMessage = () => {
    const lastBotMessage = [...messages].reverse().find(m => m.type === 'bot');
    if (lastBotMessage) {
      navigator.clipboard.writeText(lastBotMessage.content);
      alert('Message copied to clipboard');
    }
  };

  return (
    <div className="ai-bot-panel">
      {/* Header */}
      <div className="bot-header card-glass">
        <div className="bot-title">
          <FiMessageCircle size={20} />
          <div>
            <h2 className="text-sm font-bold">NOC Assistant</h2>
            <p className="text-xs text-secondary">{applicationName}</p>
          </div>
        </div>
        <div className="bot-actions">
          {/* TTS Toggle */}
          {isTtsSupported && (
            <button
              onClick={toggleTts}
              className={`bot-action-btn ${isTtsEnabled ? 'active' : ''}`}
              title={isTtsEnabled ? 'Disable voice responses' : 'Enable voice responses'}
            >
              {isTtsEnabled ? <FiVolume2 size={16} /> : <FiVolumeX size={16} />}
            </button>
          )}
          <button
            onClick={downloadConversation}
            className="bot-action-btn"
            title="Download conversation"
          >
            <FiDownload size={16} />
          </button>
          <button
            onClick={copyLastMessage}
            className="bot-action-btn"
            title="Copy last message"
          >
            <FiCopy size={16} />
          </button>
        </div>
      </div>
      
      {/* Voice Status Bar */}
      {(isListening || isSpeaking) && (
        <div className="voice-status-bar">
          {isListening && (
            <div className="voice-status listening">
              <FiMic size={14} className="pulse" />
              <span>Listening... Speak now</span>
            </div>
          )}
          {isSpeaking && (
            <div className="voice-status speaking">
              <FiVolume2 size={14} className="pulse" />
              <span>Speaking...</span>
              <button onClick={stopSpeaking} className="stop-speaking-btn">Stop</button>
            </div>
          )}
        </div>
      )}

      {/* Messages Container */}
      <div className="bot-messages">
        {messages.map((message) => (
          <div key={message.id} className={`message message-${message.type}`}>
            <div className="message-avatar">
              {message.type === 'bot' ? (
                <FiMessageCircle />
              ) : (
                <div className="user-avatar">U</div>
              )}
            </div>
            <div className="message-content">
              <div className="message-bubble">
                <p>{message.content}</p>
              </div>
              {message.sources && (
                <div className="message-sources">
                  {message.sources.map((source, idx) => (
                    <span key={idx} className="source-badge">{source}</span>
                  ))}
                </div>
              )}
              <span className="message-time">{message.timestamp.toLocaleTimeString()}</span>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message message-bot">
            <div className="message-avatar">
              <FiMessageCircle />
            </div>
            <div className="message-content">
              <div className="message-bubble loading">
                <span className="loading-dot"></span>
                <span className="loading-dot"></span>
                <span className="loading-dot"></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bot-input-area card-glass">
        <div className="input-wrapper">
          {/* Microphone Button (STT) */}
          {isSttSupported && (
            <button
              onClick={toggleListening}
              className={`mic-btn ${isListening ? 'listening' : ''}`}
              title={isListening ? 'Stop listening' : 'Start voice input'}
              type="button"
            >
              {isListening ? <FiMicOff size={18} /> : <FiMic size={18} />}
            </button>
          )}
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isListening ? "Listening... speak now" : "Ask about the application, documents, NOC creation, or compliance..."}
            className="bot-input"
            rows={2}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="send-btn"
            title="Send message"
          >
            <FiSend size={18} />
          </button>
        </div>
        <div className="input-hints">
          <p className="text-xs text-tertiary">
            {isSttSupported ? '🎤 Click mic to speak • ' : ''}💡 Try: "What are the evaluation criteria?" or "How do I add signatures?"
          </p>
        </div>
      </div>
    </div>
  );
};
