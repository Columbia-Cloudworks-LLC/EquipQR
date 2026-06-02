import { useNavigate, type To } from 'react-router-dom';

export function usePageBackNavigation(fallbackTo: To = '/') {
  const navigate = useNavigate();

  return () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(fallbackTo);
  };
}
