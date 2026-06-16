import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BackgroundAudio } from './components/BackgroundAudio';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BackgroundAudio />
    <App />
  </React.StrictMode>
);
