import React, { useEffect, useState } from 'react';

interface ErrorMessageProps {
  message: string | null;
  autoHide?: boolean;
  duration?: number;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  message, 
  autoHide = true, 
  duration = 5000 
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      
      if (autoHide) {
        const timer = setTimeout(() => {
          setVisible(false);
        }, duration);
        
        return () => clearTimeout(timer);
      }
    } else {
      setVisible(false);
    }
  }, [message, autoHide, duration]);

  if (!message || !visible) {
    return null;
  }

  return (
    <div className="error show">
      {message}
    </div>
  );
};

export default ErrorMessage; 