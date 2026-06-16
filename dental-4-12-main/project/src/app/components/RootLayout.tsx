import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Root } from './Root';

export const RootLayout = () => {
  const { user, selectedSchool } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (!selectedSchool) {
      navigate('/select-school');
    }
  }, [user, selectedSchool, navigate]);

  if (!user || !selectedSchool) return null;

  return <Root />;
};
