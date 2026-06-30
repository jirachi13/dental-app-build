import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Root } from './Root';

export const RootLayout = () => {
  const { user, loading, selectedSchool } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login');
    } else if (!selectedSchool) {
      navigate('/select-school');
    }
  }, [user, loading, selectedSchool, navigate]);

  if (loading || !user || !selectedSchool) return null;

  return <Root />;
};
