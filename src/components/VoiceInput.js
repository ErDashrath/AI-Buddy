import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import '../styles/VoiceInput.css';

const VoiceInput = () => {
  const [chatHistory, setChatHistory] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [isListeningEnabled, setIsListeningEnabled] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
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
    // Stop any ongoing speech recognition when AI starts speaking
    if (listening || isListeningEnabled) {
      SpeechRecognition.stopListening();
      setIsListeningEnabled(false);
      setCurrentTranscript('');
    }
    
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
      // Make sure speech recognition is stopped when AI starts
      SpeechRecognition.stopListening();
      setIsListeningEnabled(false);
      
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
      // Reset transcript when AI finishes speaking
      setCurrentTranscript('');
      resetTranscript();
    };
    
    // Handle speech cancellation
    utterance.onerror = () => {
      setIsSpeaking(false);
      setAiSpeakingText('');
      setAiCurrentWord('');
      if (wordInterval) clearInterval(wordInterval);
      setCurrentTranscript('');
      resetTranscript();
    };
    
    synthRef.current.speak(utterance);
  }, [listening, isListeningEnabled, resetTranscript]);

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
                  content: `You are "AI Buddy", a friendly English conversation partner who can also teach English when asked.

                  CONVERSATION STYLE:
                  - Respond naturally like a friend, not a formal teacher
                  - Keep responses to 1-2 sentences for voice chat
                  - Listen carefully to what the user just said and respond directly to it
                  - Ask follow-up questions that show you understood their message
                  - Be genuinely interested in their life and experiences
                  
                  TEACHING MODE (when user asks to learn/teach):
                  - If they ask about tenses: Explain briefly with simple examples
                  - If they ask about grammar: Give clear, short explanations with examples
                  - If they want to learn: Provide helpful teaching but keep it conversational
                  - Always offer to practice what you just taught
                  
                  RESPONSE GUIDELINES:
                  - If they say "teach me tenses" or "what are tenses": List main tenses with examples
                  - If they mention work/job: Ask about what they do, if they enjoy it
                  - If they mention studying: Ask what subject, how it's going
                  - If they mention hobbies: Show interest, ask how they got into it
                  - Always acknowledge what they said before asking something new
                  
                  BE HUMAN-LIKE:
                  - React with "That's cool!" "Really?" "Awesome!" "Great question!"
                  - Provide brief, clear explanations when teaching
                  - Don't be overly formal - keep it friendly and conversational`
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
        const lastUserMessage = userMessages[userMessages.length - 1] || '';
        const lastAIMessage = fullHistory.filter(m => m.role === 'ai')[fullHistory.filter(m => m.role === 'ai').length - 1]?.text.toLowerCase() || '';
        
        console.log('🤖 AI analyzing:', { msg, lastUserMessage, lastAIMessage });
        
        // First interaction - more natural greeting
        if (fullHistory.length === 0) {
          if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
            return "Hello! Nice to meet you! What brings you here today?";
          }
          if (msg.includes('practice') || msg.includes('english') || msg.includes('speaking')) {
            return "Great! I'm here to help you practice English. What would you like to talk about?";
          }
          return "Hi there! I'm excited to chat with you. What's on your mind?";
        }
        
        // Direct response to specific topics mentioned
        if (msg.includes('practice') && msg.includes('english')) {
          return "That's wonderful! English practice is exactly what I'm here for. What topics do you enjoy discussing?";
        }
        
        if (msg.includes('focus') || msg.includes('let\'s focus')) {
          return "Absolutely! I'm here to help you practice. What would you like to focus on specifically?";
        }
        
        // Grammar and teaching requests
        if (msg.includes('teach me') || msg.includes('teach') || msg.includes('learn')) {
          if (msg.includes('tense') || msg.includes('tenses')) {
            return "Great! English has 12 main tenses. The basic ones are: Past (I walked), Present (I walk), and Future (I will walk). Which tense would you like to practice?";
          }
          if (msg.includes('grammar')) {
            return "I'd love to help with grammar! What specific grammar topic interests you - tenses, articles, prepositions, or something else?";
          }
          return "I'm happy to teach you! What English topic would you like to learn about?";
        }
        
        // Specific grammar questions
        if (msg.includes('what are the tense') || msg.includes('what are tenses') || msg.includes('english tense')) {
          return "English has 12 tenses! The main ones are: Present Simple (I eat), Present Continuous (I am eating), Past Simple (I ate), Past Continuous (I was eating), Future Simple (I will eat), and Future Continuous (I will be eating). Want to practice one?";
        }
        
        // Name-related responses
        if (lastAIMessage.includes('name') || msg.includes('my name is') || msg.includes('i\'m ') || msg.includes('i am ')) {
          const nameMatch = msg.match(/(?:my name is|i'm|i am|call me)\s+(\w+)/i);
          if (nameMatch) {
            return `Nice to meet you, ${nameMatch[1]}! What do you like to do in your free time?`;
          }
          return "That's a lovely name! Tell me about yourself - what are your hobbies?";
        }
        
        // Work/Job responses
        if (msg.includes('work') || msg.includes('job') || msg.includes('career')) {
          return "That sounds interesting! Tell me more about your work. What do you enjoy most about it?";
        }
        
        // Study/Education responses  
        if (msg.includes('study') || msg.includes('school') || msg.includes('college') || msg.includes('university')) {
          return "Education is great! What are you studying? How are your classes going?";
        }
        
        // Hobbies responses
        if (msg.includes('hobby') || msg.includes('hobbies') || msg.includes('like to') || msg.includes('enjoy') || msg.includes('love')) {
          return "That sounds really fun! How did you get into that? Do you have any favorite memories related to it?";
        }
        
        // Follow-up questions based on previous AI questions
        if (lastAIMessage.includes('work') || lastAIMessage.includes('job')) {
          return "That's really cool! Do you work with a team or mostly independently? What's a typical day like for you?";
        }
        
        if (lastAIMessage.includes('hobbies') || lastAIMessage.includes('free time')) {
          return "That's awesome! How long have you been doing that? Have you learned anything interesting recently?";
        }
        
        if (lastAIMessage.includes('studying')) {
          return "That's great! What's your favorite subject? Are you working on any interesting projects?";
        }
        
        // Travel responses
        if (msg.includes('travel') || msg.includes('country') || msg.includes('visit') || msg.includes('trip')) {
          return "How exciting! Where have you been? What was your favorite place you've visited?";
        }
        
        // Food responses
        if (msg.includes('food') || msg.includes('eat') || msg.includes('cook') || msg.includes('restaurant')) {
          return "I love talking about food! What's your favorite dish? Do you like to cook or prefer eating out?";
        }
        
        // Generic but contextual responses for unclear messages
        const contextualResponses = [
          "That's really interesting! Can you tell me more about that?",
          "I'd love to hear more about your experience with that!",
          "That sounds fascinating! What got you interested in that?",
          "Really? That's cool! How long have you been doing that?",
          "That's awesome! What do you enjoy most about it?"
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
    console.log('🎙️ Starting speech recognition...');
    
    // Clear any previous state
    setCurrentTranscript('');
    resetTranscript();
    setIsListeningEnabled(true);
    
    try {
      SpeechRecognition.startListening({ 
        continuous: true,
        language: 'en-US'
      });
      console.log('✅ Speech recognition started successfully');
    } catch (error) {
      console.error('❌ Failed to start listening:', error);
      setIsListeningEnabled(false);
      alert('Failed to start speech recognition. Please check microphone permissions.');
    }
  }, [resetTranscript]);

  // Initialize speech recognition with better error handling
  useEffect(() => {
    if (browserSupportsSpeechRecognition) {
      console.log('🎤 Speech recognition is supported');
      
      // Check for HTTPS requirement
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        console.warn('⚠️ Speech recognition requires HTTPS in production');
      }
      
      // Test microphone permissions on component mount
      navigator.mediaDevices?.getUserMedia({ audio: true })
        .then(() => {
          console.log('✅ Microphone access available');
        })
        .catch((error) => {
          console.warn('⚠️ Microphone access issue:', error);
          alert('Microphone access is required for speech recognition. Please allow microphone access and refresh the page.');
        });
    } else {
      console.error('❌ Speech recognition not supported in this browser');
      alert('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
    }
  }, [browserSupportsSpeechRecognition]);

  useEffect(() => {
    // Don't auto-restart if we're already listening or AI is speaking
    if (!listening && !isSpeaking && !isWaiting && isListeningEnabled) {
      const restartTimeout = setTimeout(() => {
        if (isListeningEnabled && !listening && !isSpeaking && !isWaiting) {
          console.log('🎤 Attempting to restart speech recognition...');
          try {
            SpeechRecognition.startListening({ 
              continuous: true,
              language: 'en-US' 
            });
            console.log('✅ Speech recognition restarted successfully');
          } catch (error) {
            console.error('❌ Failed to restart speech recognition:', error);
            setIsListeningEnabled(false);
          }
        }
      }, 1000); // Longer delay to avoid conflicts
      
      return () => clearTimeout(restartTimeout);
    }
  }, [listening, isSpeaking, isWaiting, isListeningEnabled]);

  useEffect(() => {
    console.log('📝 Transcript changed:', transcript, 'listening:', listening, 'isSpeaking:', isSpeaking);
    
    // Update transcript immediately when we get one
    if (transcript && listening) {
      console.log('✅ Setting current transcript:', transcript);
      setCurrentTranscript(transcript);
    }
  }, [transcript, listening, isSpeaking]);

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
          ? "Click to start speaking!"
          : "Click Start Speaking to continue"
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
            🎙️ Start Speaking (You Go First!)
          </button>
        )}
        
        {/* Start Speaking Button */}
        {chatHistory.length > 0 && !isListeningEnabled && !listening && !isSpeaking && (
          <button 
            className="control-button"
            onClick={() => {
              console.log('🎙️ Start Speaking button clicked');
              
              if (!browserSupportsSpeechRecognition) {
                alert('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
                return;
              }
              
              // Clear state and start listening
              setCurrentTranscript('');
              resetTranscript();
              setIsListeningEnabled(true);
              
              try {
                SpeechRecognition.startListening({ 
                  continuous: true,
                  language: 'en-US'
                });
                console.log('✅ Speech recognition started');
              } catch (error) {
                console.error('❌ Speech recognition error:', error);
                setIsListeningEnabled(false);
                alert('Failed to start speech recognition. Please try again.');
              }
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
        
        {/* Debug Test Button */}
        <button 
          className="control-button"
          onClick={() => {
            console.log('🧪 Testing speech recognition...');
            console.log('Browser support:', browserSupportsSpeechRecognition);
            console.log('Currently listening:', listening);
            console.log('Current transcript:', currentTranscript);
            
            if (!browserSupportsSpeechRecognition) {
              alert('❌ Speech recognition not supported');
              return;
            }
            
            // Simple test
            setCurrentTranscript('');
            resetTranscript();
            
            try {
              SpeechRecognition.startListening({ 
                continuous: false,
                language: 'en-US'
              });
              console.log('✅ Test started - speak now!');
              alert('✅ Test started - say something for 5 seconds');
              
              setTimeout(() => {
                SpeechRecognition.stopListening();
                console.log('🛑 Test stopped');
              }, 5000);
            } catch (error) {
              console.error('❌ Test failed:', error);
              alert('❌ Test failed: ' + error.message);
            }
          }}
          style={{ background: '#ffc107', fontSize: '0.8rem' }}
        >
          🧪 Test Speech
        </button>
      </div>

      <div className="status">
        <span className={`indicator ${listening && !isSpeaking ? 'on' : ''}`}>
          {isSpeaking ? '🤖 AI Speaking' : 
           listening ? '🎙️ Listening...' : 
           '🎤 Ready'}
        </span>
      </div>

      {/* Live Transcript Display */}
      <div className={`${isSpeaking ? 'speaking-pulse live-transcript-ai' : 'live-transcript-user'}`} style={{ 
        padding: '15px', 
        margin: '15px 0', 
        border: isSpeaking ? '2px solid #28a745' : '2px solid #007bff', 
        borderRadius: '12px',
        backgroundColor: isSpeaking ? '#e8f5e8' : (currentTranscript ? '#e3f2fd' : '#f8f9fa'),
        minHeight: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center', width: '100%' }}>
          {isSpeaking ? (
            <p style={{ color: '#28a745', fontSize: '1.1rem', margin: '0' }}>
              🤖 {aiCurrentWord || aiSpeakingText}
            </p>
          ) : (
            <p style={{ color: currentTranscript ? '#1976d2' : '#666', fontSize: '1.1rem', margin: '0' }}>
              {currentTranscript ? `"${currentTranscript}"` : 
               listening ? 'Listening...' : 
               'Click Start Speaking'}
            </p>
          )}
        </div>
      </div>

      <div className="conversation">
        {chatHistory.map((entry, index) => (
          <div key={index} className={`message ${entry.role}`}>
            <div className="sender">{entry.role === 'user' ? 'You' : 'AI'}</div>
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
