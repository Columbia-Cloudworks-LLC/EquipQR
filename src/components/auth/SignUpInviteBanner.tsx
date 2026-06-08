import React from 'react';

type SignUpInviteBannerProps = {
  invitedOrgName: string;
};

const SignUpInviteBanner: React.FC<SignUpInviteBannerProps> = ({ invitedOrgName }) => (
  <div className="bg-info/10 border border-info/30 rounded-lg p-3 text-sm">
    <p className="text-info">
      You&apos;ll join <strong>{invitedOrgName}</strong> after signing up. Please choose a different name for your own workspace below.
    </p>
  </div>
);

export default SignUpInviteBanner;
