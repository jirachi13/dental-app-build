import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AuthProvider } from './context/AuthContext';
import { OfflineBanner } from './components/OfflineBanner';
import { UpdateToast } from './components/UpdateToast';
import { initQueueProcessor } from './offline/queueProcessor';

export default function App() {
  useEffect(() => {
    initQueueProcessor();
  }, []);

  return (
    <AuthProvider>
      <OfflineBanner />
      <UpdateToast />
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
