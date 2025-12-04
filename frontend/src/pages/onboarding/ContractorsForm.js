// src/pages/onboarding/ContractorsForm.js
import React, { useState } from 'react';

export default function ContractorsForm({ token, invite }) {
  const [cmrInsurance, setCmrInsurance] = useState(null);
  const [cmrPayment, setCmrPayment] = useState(null);
  const [euLicense, setEuLicense] = useState(null);
  const [ibanConfirmation, setIbanConfirmation] = useState(null);
  const [otherDocs, setOtherDocs] = useState([]);

  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!cmrInsurance || !euLicense || !ibanConfirmation) {
      setErrorMsg('Please upload all required documents.');
      return;
    }

    if (!confirmed) {
      setErrorMsg('Please confirm that the uploaded data is complete and correct.');
      return;
    }

    try {
      setSubmitting(true);

      const fd = new FormData();

      // (Optional) send companyName/contactEmail to backend,
      // even though backend can default from invite.
      if (invite?.carrierName) {
        fd.append('companyName', invite.carrierName);
      }
      if (invite?.contactEmail) {
        fd.append('contactEmail', invite.contactEmail);
      }

      fd.append('cmrInsurance', cmrInsurance);
      if (cmrPayment) fd.append('cmrPayment', cmrPayment);
      fd.append('euLicense', euLicense);
      fd.append('ibanConfirmation', ibanConfirmation);

      if (otherDocs && otherDocs.length) {
        Array.from(otherDocs).forEach((file) => {
          fd.append('otherDocs', file);
        });
      }

      const res = await fetch(`/api/onboarding/submit?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        body: fd,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Submission failed');
      }

      setSuccessMsg('Thank you! Your documents have been submitted.');
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      {successMsg && <div style={{ ...styles.alert, ...styles.alertSuccess }}>{successMsg}</div>}
      {errorMsg && <div style={{ ...styles.alert, ...styles.alertError }}>{errorMsg}</div>}

      <div style={styles.grid}>
        {/* CMR Insurance */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>CMR-Insurance *</h3>
          <p style={styles.helpText}>Upload your valid CMR insurance document (PDF/image).</p>
          <input
            type="file"
            accept=".pdf,image/*"
            onChange={(e) => setCmrInsurance(e.target.files?.[0] || null)}
            required
          />
        </div>

        {/* Payment Confirmation */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Payment Confirmation for CMR-Insurance</h3>
          <p style={styles.helpText}>Optional upload of the payment confirmation.</p>
          <input
            type="file"
            accept=".pdf,image/*"
            onChange={(e) => setCmrPayment(e.target.files?.[0] || null)}
          />
        </div>

        {/* EU License */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>EU-License *</h3>
          <p style={styles.helpText}>Upload your EU transport license.</p>
          <input
            type="file"
            accept=".pdf,image/*"
            onChange={(e) => setEuLicense(e.target.files?.[0] || null)}
            required
          />
        </div>

        {/* Bank Confirmation of IBAN */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Bank Confirmation of your IBAN *</h3>
          <p style={styles.helpText}>Document from your bank confirming your IBAN.</p>
          <input
            type="file"
            accept=".pdf,image/*"
            onChange={(e) => setIbanConfirmation(e.target.files?.[0] || null)}
            required
          />
        </div>

        {/* Other uploads */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Other uploads</h3>
          <p style={styles.helpText}>Any additional documents (optional).</p>
          <input
            type="file"
            accept=".pdf,image/*"
            multiple
            onChange={(e) => setOtherDocs(e.target.files || [])}
          />
        </div>
      </div>

      {/* Confirmation checkbox */}
      <div style={{ marginTop: '1.5rem' }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          <span>
            I confirm that I have uploaded all required files completely and that the data is correct.
          </span>
        </label>
      </div>

      {/* Submit button */}
      <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
        <button
          type="submit"
          disabled={submitting || !confirmed}
          style={{
            ...styles.button,
            opacity: submitting || !confirmed ? 0.7 : 1,
            cursor: submitting || !confirmed ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? 'Submitting…' : 'Next'}
        </button>
      </div>
    </form>
  );
}

const styles = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '1rem',
  },
  card: {
    border: '1px solid #ddd',
    borderRadius: '6px',
    padding: '1rem',
    background: '#fafafa',
  },
  cardTitle: {
    margin: '0 0 0.25rem 0',
    fontSize: '1rem',
    fontWeight: 600,
  },
  helpText: {
    margin: '0 0 0.5rem 0',
    fontSize: '0.85rem',
    color: '#666',
  },
  button: {
    padding: '0.6rem 1.4rem',
    borderRadius: '4px',
    border: 'none',
    background: '#e6007a', // go full GCT pink if you want
    color: 'white',
    fontWeight: 600,
    fontSize: '0.95rem',
  },
  alert: {
    padding: '0.75rem 1rem',
    borderRadius: '4px',
    fontSize: '0.9rem',
  },
  alertSuccess: {
    background: '#e6ffed',
    border: '1px solid #2ecc71',
    color: '#1e7e34',
  },
  alertError: {
    background: '#ffe6e6',
    border: '1px solid #e74c3c',
    color: '#c0392b',
  },
};

//In Translogica sunt toate datele de firma dupa numarul de timocom si sa le luam de acolo - CONTINUA SA CAUTI API