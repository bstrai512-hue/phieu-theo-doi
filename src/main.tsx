import React from 'react';
import ReactDOM from 'react-dom/client';
import { TreatmentServicesProvider } from './services/treatment-records';
import App from './App';
import './index.css';
import './print-preview.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TreatmentServicesProvider><App /></TreatmentServicesProvider>
  </React.StrictMode>,
);
