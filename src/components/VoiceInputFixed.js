import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import '../styles/VoiceInput.css';

const VoiceInput = () => {
  const [chatHistory, setChatHistory] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [isListeningEnabled, setIsListeningEnabled] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [hasSpoken, setHasSpoken] = useState(false);
  const [aiSpeakingText, setAiSpeakingText] = useState('');
  const [aiCurrentWord, setAiCurrentWord] = useState('');
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
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    
    // Set up AI speaking transcript
    setAiSpeakingText(text);
    setAiCurrentWord('');
    
    // Store interval reference to clear it properly
    let wordInterval;
    
    utterance.onstart = () => {
      setIsSpeaking(true);
      // Start word-by-word display simulation
      const words = text.split(' ');
      let wordIndex = 0;
      
      wordInterval = setInterval(() => {
        if (wordIndex < words.length) {
          const spokenSoFar = words.slice(0, wordIndex + 1).join(' ');
          setAiCurrentWord(spokenSoFar);
          wordIndex++;
        } else {
          clearInterval(wordInterval);
        }
      }, 350); // Adjusted word timing to match speech rate
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      setAiSpeakingText('');
      setAiCurrentWord('');
      if (wordInterval) clearInterval(wordInterval);
    };
    
    // Handle speech cancellation
    utterance.onerror = () => {
      setIsSpeaking(false);
      setAiSpeakingText('');
      setAiCurrentWord('');
      if (wordInterval) clearInterval(wordInterval);
    };
    
    synthRef.current.speak(utterance);
  }, []);

  const sendMessageToAI = useCallback(async (userMessage) => {
    setIsWaiting(true);
    try {
      // Enhanced session context - remember full conversation
      const conversationHistory = chatHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));

      // Try to use real OpenAI API first
      try {
        const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
        console.log('🔑 API Key available:', apiKey ? 'Yes' : 'No');
        console.log('📝 Sending conversation history:', conversationHistory.length, 'messages');
        
        if (apiKey && apiKey !== 'your_openai_api_key_here') {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: 'gpt-3.5-turbo',
              messages: [
                {
                  role: 'system',
                  content: `You are "AI Buddy", a friendly English conversation partner. 
                  
                  CONVERSATION STYLE:
                  - Keep responses to 1-2 sentences (for voice chat)
                  - Be encouraging and supportive
                  - Ask engaging questions to continue the conversation
                  - React naturally to what the user just said
                  - Reference previous topics when relevant
                  - Build natural flowing conversations
                  
                  ENGLISH PRACTICE:
                  - Help users practice spoken English naturally
                  - Gently correct major mistakes if they interrupt understanding
                  - Focus on conversation flow over perfect grammar`
                },
                ...conversationHistory,
                { role: 'user', content: userMessage }
              ],
              max_tokens: 120,
              temperature: 0.8
            })
          });

          if (response.ok) {
            const data = await response.json();
            const aiReply = data.choices[0].message.content.trim();
            console.log('✅ OpenAI API Response:', aiReply);
            setChatHistory(prev => [...prev, { role: 'ai', text: aiReply }]);
            speak(aiReply);
            return;
          } else {
            console.log('❌ OpenAI API error:', response.status, await response.text());
          }
        }
      } catch (apiError) {
        console.log('OpenAI API not available, using enhanced mock responses');
      }

      // Enhanced intelligent mock responses with full session memory
      const generateSmartResponse = (message, fullHistory) => {
        const msg = message.toLowerCase();
        const userMessages = fullHistory.filter(m => m.role === 'user').map(m => m.text.toLowerCase());
        const aiMessages = fullHistory.filter(m => m.role === 'ai').map(m => m.text.toLowerCase());
        const lastAIMessage = aiMessages[aiMessages.length - 1] || '';
        
        // Remember topics mentioned throughout conversation
        const topicsDiscussed = {
          name: userMessages.some(m => m.includes('my name is') || m.includes("i'm ") || m.includes("i am ")),
          work: userMessages.some(m => m.includes('work') || m.includes('job') || m.includes('career')),
          study: userMessages.some(m => m.includes('study') || m.includes('school') || m.includes('college')),
          hobbies: userMessages.some(m => m.includes('hobby') || m.includes('like to') || m.includes('enjoy')),
          travel: userMessages.some(m => m.includes('travel') || m.includes('country') || m.includes('visit')),
          food: userMessages.some(m => m.includes('food') || m.includes('eat') || m.includes('cook'))
        };
        
        // First interaction
        if (fullHistory.length === 0) {
          if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
            return "Hello! I'm AI Buddy, your English conversation partner. What's your name?";
          }
          return "Hi there! I'm excited to chat with you and help with your English practice. What's your name?";
        }
        
        // Natural follow-ups based on conversation history
        if (lastAIMessage.includes('name') && !topicsDiscussed.name) {
          const nameMatch = msg.match(/(?:my name is|i'm|i am|call me)\s+(\w+)/i);
          if (nameMatch) {
            return `Nice to meet you, ${nameMatch[1]}! What brings you here today? Are you working or studying?`;
          }
          return "That's a lovely name! What do you like to do in your free time?";
        }
        
        if (msg.includes('work') || msg.includes('job')) {
          if (!topicsDiscussed.work) {
            return "That sounds interesting! What kind of work do you do? Do you enjoy it?";
          } else {
            return "How has work been going for you lately? Any exciting projects?";
          }
        }
        
        if (msg.includes('study') || msg.includes('school') || msg.includes('college')) {
          return "Education is great! What are you studying? What's your favorite subject?";
        }
        
        // Context-aware responses
        const contextualResponses = [
          `That's really interesting! ${topicsDiscussed.work ? 'How does that relate to your work?' : 'Tell me more about that.'}`,
          `I see! ${topicsDiscussed.study ? 'Is this something you learned in school?' : 'What got you interested in that?'}`,
          `That makes sense. ${fullHistory.length > 4 ? 'You mentioned earlier about your interests - is this related?' : 'What else do you enjoy doing?'}`,
          `Thanks for sharing that with me! ${topicsDiscussed.travel ? 'Have you traveled anywhere interesting?' : 'What are your hobbies?'}`,
          `That's fascinating! ${topicsDiscussed.hobbies ? 'You seem to have diverse interests!' : 'What else are you passionate about?'}`
        ];
        
        return contextualResponses[Math.floor(Math.random() * contextualResponses.length)];
      };
      
      const aiResponse = generateSmartResponse(userMessage, chatHistory);
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
      
      if (stopPhrases.includes(message.toLowerCase())) {
        setIsListeningEnabled(false);
        setCurrentTranscript('');
        speak("Okay, I've stopped. Click the button when you're ready to continue.");
        return;
      }

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
    
    if (chatHistory.length === 0) {
      speak("Hello! I'm AI Buddy. I'm here to help you practice English through natural conversation. What's your name?");
    }
  }, [resetTranscript, chatHistory.length, speak]);

  const stopListening = useCallback(() => {
    setIsListeningEnabled(false);
    setHasSpoken(false);
    SpeechRecognition.stopListening();
  }, []);

  useEffect(() => {
    if (!listening && !isSpeaking && !isWaiting && isListeningEnabled) {
      setTimeout(() => {
        if (isListeningEnabled && !listening && !isSpeaking) {
          SpeechRecognition.startListening({ continuous: true });
        }
      }, 100);
    }
  }, [listening, isSpeaking, isWaiting, isListeningEnabled]);

  useEffect(() => {
    if (transcript) {
      setCurrentTranscript(transcript);
      setHasSpoken(true);
      
      // Stop AI speaking when user starts talking (Alexa-style)
      if (isSpeaking && transcript.length > 3) {
        synthRef.current.cancel();
        setIsSpeaking(false);
        setAiSpeakingText('');
        setAiCurrentWord('');
      }
    }
  }, [transcript, isSpeaking]);

  if (!browserSupportsSpeechRecognition) {
    return (
      <div className="voice-container">
        <div className="error" style={{ 
          padding: '20px', 
          background: '#f8d7da', 
          border: '1px solid #f5c6cb', 
          borderRadius: '8px', 
          color: '#721c24',
          textAlign: 'center'
        }}>
          <h3>⚠️ Speech Recognition Not Supported</h3>
          <p>Your browser doesn't support speech recognition.</p>
          <p><strong>Try using:</strong> Chrome, Edge, or Safari for the best experience.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="voice-container">
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>🎙️ AI Buddy</h1>
      <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '1rem', textAlign: 'center' }}>
        {chatHistory.length === 0 
          ? "🗣️ English Conversation Practice | Click 'Start Conversation' to begin!"
          : `💬 Conversation Active: ${chatHistory.length} messages | Click 'Start Speaking' → Record → 'Send Message'`
        }
      </p>
      
      <div className="controls">
        {/* Start Conversation Button */}
        {chatHistory.length === 0 && (
          <button 
            className="control-button"
            onClick={startListening}
            disabled={isSpeaking || isWaiting}
            style={{ background: '#007bff', fontWeight: 'bold' }}
          >
            🎙️ Start Conversation
          </button>
        )}
        
        {/* Start Speaking Button */}
        {chatHistory.length > 0 && !isListeningEnabled && !listening && (
          <button 
            className="control-button"
            onClick={() => {
              setIsListeningEnabled(true);
              setCurrentTranscript('');
              resetTranscript();
              SpeechRecognition.startListening({ continuous: true });
            }}
            disabled={isSpeaking || isWaiting}
            style={{ background: '#28a745', fontWeight: 'bold' }}
          >
            🎙️ Start Speaking
          </button>
        )}
        
        {/* Send Message Button (when recording) */}
        {(isListeningEnabled || listening) && (
          <button 
            className="control-button"
            onClick={() => {
              SpeechRecognition.stopListening();
              setIsListeningEnabled(false);
              if (currentTranscript.trim()) {
                handleSendMessage();
              }
            }}
            disabled={isSpeaking || isWaiting || !currentTranscript.trim()}
            style={{ background: '#dc3545', fontWeight: 'bold' }}
          >
            📤 Send Message
          </button>
        )}
        
        {chatHistory.length > 0 && chatHistory[chatHistory.length - 1]?.role === 'ai' && (
          <button 
            className="control-button"
            onClick={() => speak(chatHistory[chatHistory.length - 1].text)}
            disabled={isSpeaking || isWaiting}
            style={{ background: '#17a2b8' }}
          >
            🔊 Speak Last Response
          </button>
        )}
      </div>

      <div className="status">
        <span className={`indicator ${listening ? 'on' : ''}`}>
          {listening ? '🎙️ Recording Your Voice...' : (chatHistory.length === 0 ? '🎤 Ready to Start' : '🎤 Ready to Speak')}
        </span>
        {isSpeaking && <span className="indicator on">🤖 AI Speaking</span>}
        {isWaiting && <span className="indicator on">⏳ AI Thinking...</span>}
        
        {/* Debug Info */}
        <div style={{ 
          marginTop: '10px', 
          padding: '8px', 
          background: '#f8f9fa', 
          borderRadius: '4px',
          fontSize: '0.75rem',
          color: '#666'
        }}>
          <strong>Status:</strong> Recording: {listening ? '✅' : '❌'} | 
          Words Captured: {currentTranscript.split(' ').filter(word => word.trim()).length} | 
          Ready to Send: {currentTranscript.trim() ? '✅' : '❌'}
        </div>
      </div>

      {/* Live Transcript Display - Both User and AI */}
      <div className={`${isSpeaking ? 'speaking-pulse live-transcript-ai' : 'live-transcript-user'}`} style={{ 
        padding: '15px', 
        margin: '15px 0', 
        border: isSpeaking ? '2px solid #28a745' : '2px solid #007bff', 
        borderRadius: '12px',
        backgroundColor: isSpeaking ? '#e8f5e8' : (currentTranscript ? '#e3f2fd' : '#f8f9fa'),
        minHeight: '100px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center', width: '100%' }}>
          {/* AI Thinking/Processing Display */}
          {isWaiting && !isSpeaking && (
            <div style={{ marginBottom: '15px' }}>
              <h4 style={{ color: '#ff9800', margin: '0 0 8px 0', fontSize: '1rem' }}>
                🤔 AI Thinking...
              </h4>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                gap: '5px'
              }}>
                <div style={{ 
                  width: '8px', 
                  height: '8px', 
                  background: '#ff9800', 
                  borderRadius: '50%',
                  animation: 'pulse 1s ease-in-out infinite'
                }}></div>
                <div style={{ 
                  width: '8px', 
                  height: '8px', 
                  background: '#ff9800', 
                  borderRadius: '50%',
                  animation: 'pulse 1s ease-in-out infinite 0.3s'
                }}></div>
                <div style={{ 
                  width: '8px', 
                  height: '8px', 
                  background: '#ff9800', 
                  borderRadius: '50%',
                  animation: 'pulse 1s ease-in-out infinite 0.6s'
                }}></div>
              </div>
            </div>
          )}
          
          {/* AI Speaking Live Transcript */}
          {isSpeaking && aiSpeakingText && (
            <div style={{ marginBottom: '15px' }}>
              <h4 style={{ color: '#28a745', margin: '0 0 8px 0', fontSize: '1rem' }}>
                🤖 AI Speaking Live:
              </h4>
              <p style={{ 
                color: '#155724', 
                fontSize: '1.1rem',
                margin: '0',
                fontWeight: '500',
                lineHeight: '1.4'
              }}>
                "{aiCurrentWord || aiSpeakingText}"
              </p>
              <div style={{ 
                marginTop: '8px',
                padding: '4px 8px',
                background: '#28a745',
                color: 'white',
                borderRadius: '12px',
                fontSize: '0.75rem',
                display: 'inline-block'
              }}>
                🔊 Speaking...
              </div>
            </div>
          )}
          
          {/* User Speaking Live Transcript */}
          {!isSpeaking && (
            <div>
              <h4 style={{ 
                color: currentTranscript ? '#1976d2' : '#666', 
                margin: '0 0 8px 0', 
                fontSize: '1rem'
              }}>
                {listening ? '🎙️ Recording Your Voice:' : (currentTranscript ? '✅ Your Message:' : '🎤 Click "Start Speaking" to begin')}
              </h4>
              <p style={{ 
                color: currentTranscript ? '#1976d2' : '#666', 
                fontStyle: currentTranscript ? 'normal' : 'italic', 
                fontSize: '1.1rem',
                margin: '0 0 10px 0',
                fontWeight: currentTranscript ? '500' : 'normal',
                lineHeight: '1.4'
              }}>
                {currentTranscript ? `"${currentTranscript}"` : (listening ? 'Speak now...' : 'Ready to listen')}
              </p>
              {currentTranscript && (
                <div style={{ 
                  marginTop: '8px',
                  padding: '4px 8px',
                  background: listening ? '#28a745' : '#dc3545',
                  color: 'white',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  display: 'inline-block'
                }}>
                  {listening ? '🎙️ Still Recording... Click Send when done' : '📤 Ready to Send - Click Send Message'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="conversation">
        {chatHistory.length > 0 && (
          <div style={{ 
            padding: '10px', 
            background: '#f8f9fa', 
            borderRadius: '8px', 
            marginBottom: '15px',
            border: '1px solid #e9ecef'
          }}>
            <small style={{ color: '#666', fontSize: '0.8rem' }}>
              💬 Conversation: {chatHistory.length} messages | 
              Current topic: {(() => {
                const lastUser = [...chatHistory].reverse().find(m => m.role === 'user')?.text || 'Getting started';
                return lastUser.length > 30 ? lastUser.substring(0, 30) + '...' : lastUser;
              })()}
            </small>
          </div>
        )}
        
        {chatHistory.map((entry, index) => (
          <div key={index} className={`message ${entry.role}`}>
            <div className="sender">
              {entry.role === 'user' ? 'You' : 'AI'} 
              <small style={{ marginLeft: '5px', opacity: 0.7 }}>
                #{index + 1}
              </small>
            </div>
            <div>{entry.text}</div>
            {entry.role === 'ai' && (
              <button 
                onClick={() => speak(entry.text)}
                disabled={isSpeaking}
                style={{ 
                  marginTop: '5px', 
                  padding: '2px 8px', 
                  fontSize: '0.7rem',
                  background: 'transparent',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                🔊 Replay
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default VoiceInput;
