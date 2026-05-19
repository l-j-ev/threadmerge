import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Wait for Office.js to initialise before mounting React.
// This is required for any Office.js APIs to work inside the add-in.
Office.onReady(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
