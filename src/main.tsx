import { MotionSettingsProvider } from './components/ui/motion-settings';
import React from 'react';import{createRoot}from'react-dom/client';import App from './App';import './index.css';createRoot(document.getElementById('root')!).render(<React.StrictMode><MotionSettingsProvider><App/></MotionSettingsProvider></React.StrictMode>);
