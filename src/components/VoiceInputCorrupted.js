import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import '../styles/VoiceInput.css';

      <div className="controls">
        <button 
          className={`control-button ${isListeningEnabled ? 'active' : ''}`}
          onClick={isListeningEnabled ? stopListening : startListening}
          disabled={isSpeaking || isWaiting}
        >
          {isListeningEnabled ? '⏸️ Stop Listening' : (chatHistory.length === 0 ? '🎙️ Start Conversation' : '🎙️ Listen')}
        </button>
        
        {currentTranscript && (
          <button 
            className="control-button"
            onClick={handleSendMessage}
            disabled={isSpeaking || isWaiting || !currentTranscript.trim()}
            style={{ background: '#28a745' }}
          >
            📤 Send Message
          </button>
        )}
      </div>ceInput = () => {
  const [chatHistory, setChatHistory] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [isListeningEnabled, setIsListeningEnabled] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [hasSpoken, setHasSpoken] = useState(false);
  const synthRef = useRef(window.speechSynthesis);
  
  // Use useMemo to avoid ESLint dependency warnings
  const stopPhrases = useMemo(() => ['okay you can stop', 'stop', 'cancel'], []);

  const {
    transcript,
    resetTranscript,
    listening,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  const speak = useCallback((text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1; // Slightly faster like Alexa
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      // Don't auto-restart listening - user will control when to listen
    };
    synthRef.current.speak(utterance);
  }, []);

  const sendMessageToAI = useCallback(async (userMessage) => {
    setIsWaiting(true);
    try {
      // Try to use real OpenAI API first
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`, // Add your API key to .env file
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: 'You are a friendly English conversation partner. Help users practice English naturally. Remember the conversation context and ask engaging follow-up questions. Keep responses conversational and encouraging.'
              },
              ...chatHistory.slice(-6).map(msg => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.text
              })),
              { role: 'user', content: userMessage }
            ],
            max_tokens: 150,
            temperature: 0.7
          })
        });

        if (response.ok) {
          const data = await response.json();
          const aiReply = data.choices[0].message.content;
          setChatHistory(prev => [...prev, { role: 'ai', text: aiReply }]);
          speak(aiReply);
          return;
        }
      } catch (apiError) {
        console.log('OpenAI API not available, using mock responses');
      }

      // Fallback to intelligent mock responses with conversation memory
      const conversationContext = chatHistory.slice(-6);
      const generateContextualResponse = (message, history) => {
        const msg = message.toLowerCase();
        
        // First interaction responses
        if (history.length === 0) {
          if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
            return "Hello there! It's great to meet you. I'm here to help you practice your English. What's your name, and what brings you here today?";
          }
          if (msg.includes('learn') || msg.includes('practice')) {
            return "Wonderful! I love helping people improve their English. What specific area would you like to focus on - conversation, pronunciation, or maybe just casual chat?";
          }
          if (msg.includes('name') || msg.includes('called')) {
            return "Nice to meet you! I'm your AI English speaking partner. I'm here to have natural conversations with you. What would you like to talk about?";
          }
          return "Hello! I'm excited to chat with you and help with your English. What's on your mind today?";
        }
        
        // Context-aware responses based on conversation history
        const lastAIMessage = history.slice(-1)[0]?.text?.toLowerCase() || '';
        
        // If user is responding to a question about their name
        if (lastAIMessage.includes('name') && !msg.includes('question')) {
          return `Nice to meet you! That's a lovely name. So, what brings you to practice English today? Are you preparing for something specific or just want to improve your conversation skills?`;
        }
        
        // If discussing learning goals
        if (msg.includes('learn') || msg.includes('improve') || msg.includes('practice')) {
          return "That's a great goal! Practice makes perfect. What topics do you enjoy talking about? Maybe we can discuss your hobbies, work, or anything that interests you.";
        }
        
        // If user mentions work/job
        if (msg.includes('work') || msg.includes('job') || msg.includes('office')) {
          return "Work is such an important part of life! What kind of work do you do? I'd love to hear about your experiences and maybe help you with work-related English.";
        }
        
        // Default contextual responses
        const contextualResponses = [
          "That's really interesting! Can you tell me more about that?",
          "I see what you mean. What's your experience with that?",
          "That makes sense. How do you feel about that?",
          "Thanks for sharing! What led you to that conclusion?",
          "That's fascinating. What got you interested in that?",
          "I understand. What would you like to explore next?",
        ];
        
        return contextualResponses[Math.floor(Math.random() * contextualResponses.length)];
      };
      
      const aiResponse = generateContextualResponse(userMessage, conversationContext);
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
      
      setChatHistory(prev => [...prev, { role: 'ai', text: aiResponse }]);
      speak(aiResponse);
    } catch (error) {
      console.error('Error from AI:', error);
      speak("I'm having a small technical issue. Please try again.");
    } finally {
      setIsWaiting(false);
    }
  }, [speak, chatHistory]);

  const handleSendMessage = useCallback(() => {
    if (currentTranscript.trim()) {
      const message = currentTranscript.trim();
      
      // Check for stop phrases
      if (stopPhrases.includes(message.toLowerCase())) {
        setIsListeningEnabled(false);
        setCurrentTranscript('');
        speak("Okay, I've stopped. Click the button when you're ready to continue.");
        return;
      }

      // Add user message and send to AI
      setChatHistory(prev => [...prev, { role: 'user', text: message }]);
      sendMessageToAI(message);
      setCurrentTranscript('');
      setIsListeningEnabled(false);
    }
  }, [currentTranscript, stopPhrases, speak, sendMessageToAI]);

  const startListening = useCallback(() => {
    setIsListeningEnabled(true);
    setHasSpoken(false);
    setCurrentTranscript('');
    resetTranscript();
    
    // If this is the first interaction, give a welcome message
    if (chatHistory.length === 0) {
      speak("Hello! I'm your AI English speaking partner. I'll remember our conversation and help you practice naturally. After I finish speaking, click 'Start Listening' to respond!");
    } else {
      SpeechRecognition.startListening({ continuous: true });
    }
  }, [resetTranscript, chatHistory.length, speak]);

  const stopListening = useCallback(() => {
    setIsListeningEnabled(false);
    setHasSpoken(false);
    SpeechRecognition.stopListening();
  }, []);

  useEffect(() => {
    if (!listening && !isSpeaking && !isWaiting && isListeningEnabled) {
      SpeechRecognition.startListening({ continuous: true });
    }
  }, [listening, isSpeaking, isWaiting, isListeningEnabled]);

  // Update current transcript from speech recognition
  useEffect(() => {
    if (transcript) {
      setCurrentTranscript(transcript);
      setHasSpoken(true);
    }
  }, [transcript]);

  if (!browserSupportsSpeechRecognition) {
    return <div className="error">Your browser doesn't support speech recognition.</div>;
  }

  return (
    <div className="voice-container">
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>🎙️ AI Buddy</h1>
      <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '1rem', textAlign: 'center' }}>
        {chatHistory.length === 0 
          ? "Click to start! I'll introduce myself, then you can listen and respond manually."
          : "I remember our conversation! Listen, speak, and use the Send button when ready."
        }
      </p>
      
      <div className="controls">
        <button 
          className={`control-button ${isListeningEnabled ? 'active' : ''}`}
          onClick={isListeningEnabled ? stopListening : startListening}
          disabled={isSpeaking || isWaiting}
        >
          {isListeningEnabled ? '⏸️ Pause Conversation' : (chatHistory.length === 0 ? '�️ Start Conversation' : '🎙️ Continue Conversation')}
        </button>
      </div>

      <div className="status">
        <span className={`indicator ${listening ? 'on' : ''}`}>
          {listening ? (hasSpoken ? '⏳ Waiting for you to finish...' : '🎧 Listening...') : '🛑 Not Listening'}
        </span>
        {isSpeaking && <span className="indicator on">🔊 Speaking...</span>}
        {isWaiting && <span className="indicator on">⏳ Processing...</span>}
      </div>

      {/* Live Transcript Display */}
      <div style={{ 
        padding: '10px', 
        margin: '10px 0', 
        border: '2px solid #ddd', 
        borderRadius: '8px',
        backgroundColor: transcript ? '#f0f8ff' : '#f9f9f9',
        minHeight: '50px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <p style={{ 
          color: transcript ? '#333' : '#666', 
          fontStyle: transcript ? 'normal' : 'italic', 
          fontSize: '1rem',
          margin: 0,
          textAlign: 'center'
        }}>
          {transcript ? `🗣️ "${transcript}"` : (isListeningEnabled ? '� Listening for your voice...' : '🎤 Ready to listen')}
        </p>
      </div>

      <div className="conversation">{chatHistory.map((entry, index) => (
          <div key={index} className={`message ${entry.role}`}>
            <div className="sender">{entry.role === 'user' ? 'You' : 'AI'}:</div>
            <div>{entry.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VoiceInput;
