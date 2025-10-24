import React from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';

interface HCaptchaComponentProps {
  onSuccess: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

const HCaptchaComponent: React.FC<HCaptchaComponentProps> = ({
  onSuccess,
  onError,
  onExpire
}) => {
  const siteKey = import.meta.env.VITE_HCAPTCHA_SITEKEY as string | undefined;

  if (!siteKey) {
    return null;
  }

  return (
    <div className="flex justify-center my-4">
      <HCaptcha
        sitekey={siteKey}
        onVerify={onSuccess}
        onError={onError}
        onExpire={onExpire}
      />
    </div>
  );
};

export default HCaptchaComponent;