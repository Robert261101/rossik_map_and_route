// src/pages/onboarding/OnboardingPage.js
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ContractorsForm from './ContractorsForm';

export default function OnboardingPage() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading'); // loading | error | ok
  const [invite, setInvite] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) return;

    const run = async () => {
      try {
        setStatus('loading');
        const res = await fetch(`/api/onboarding/validate?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Invalid or expired link');
        setInvite(data);
        setStatus('ok');
      } catch (err) {
        console.error(err);
        setErrorMsg(err.message || 'Something went wrong');
        setStatus('error');
      }
    };

    run();
  }, [token]);

  if (status === 'loading') {
    return <div style={{ padding: '2rem' }}>Checking your invite…</div>;
  }

  if (status === 'error') {
    return (
      <div style={{ padding: '2rem' }}>
        <h1>Onboarding link problem</h1>
        <p>{errorMsg}</p>
        <p>Please contact the person who sent you this link.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
      <h1>Transport Contractor Onboarding</h1>
      <p>
        Company: <strong>{invite.carrierName}</strong>
      </p>
      <p>
        Contact email on file: <strong>{invite.contactEmail}</strong>
      </p>
      <hr style={{ margin: '1.5rem 0' }} />
      <ContractorsForm token={token} invite={invite} />
    </div>
  );
}
