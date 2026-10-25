import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { installErrorReports } from './net/reports.ts';

// Before the first render, so a throw while the shell mounts is reported too.
installErrorReports();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
