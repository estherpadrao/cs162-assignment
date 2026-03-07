import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

/**
 * Application entry point.
 *
 * Mounts the React app into the #root DOM element with StrictMode enabled.
 * StrictMode runs extra checks and warnings in development only — it has
 * no effect in production.
 *
 * @param {void}
 * @returns {void}
 */

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
