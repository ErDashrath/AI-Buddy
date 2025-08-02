import React from 'react';
import VoiceInput from './components/VoiceInput';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>AI Buddy</h1>
        <p>Your English Speaking Partner</p>
      </header>
      <main>
        <VoiceInput />
      </main>
    </div>
  );
}

export default App;