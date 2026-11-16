import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@cloudscape-design/global-styles/index.css';
import ErrorBoundary from '@cloudscape-design/components/error-boundary';
import { I18nProvider } from '@cloudscape-design/components/i18n';
import messages from '@cloudscape-design/components/i18n/messages/all.en';
import App from './App.jsx';
import { StoreProvider } from './state/store.jsx';

// Top-level Error boundary around the whole app, with the default fallback (Cloudscape Error boundary
// guideline; Lisa's answers Nov 16). The drawer has its own section-level boundary (frame 22).
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider locale="en" messages={[messages]}>
      <ErrorBoundary errorBoundaryId="app" onError={() => {}}>
        <StoreProvider>
          <App />
        </StoreProvider>
      </ErrorBoundary>
    </I18nProvider>
  </StrictMode>,
);
