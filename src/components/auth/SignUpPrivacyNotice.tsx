import React from 'react';
import { Link } from 'react-router-dom';

const SignUpPrivacyNotice: React.FC = () => (
  <p className="text-sm text-muted-foreground leading-relaxed">
    We collect your name, email, and organization details to create your account. See our{' '}
    <Link to="/privacy-policy#notice-at-collection" className="text-primary underline underline-offset-2">
      Privacy Notice at Collection
    </Link>
    .
  </p>
);

export default SignUpPrivacyNotice;
