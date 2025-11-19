import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './styles/theme.css';
import './styles/accessibility.css';
import './styles/responsive.css';
import { initializePassiveListeners } from './utils/eventListeners';

// Initialize passive event listeners for better scrolling performance
initializePassiveListeners();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);