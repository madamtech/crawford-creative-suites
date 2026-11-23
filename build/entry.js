import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import './send.js';
import './voice.js';
import './kiosk.js';
import Building from './app.patched.js';

createRoot(document.getElementById('app')).render(createElement(Building));
