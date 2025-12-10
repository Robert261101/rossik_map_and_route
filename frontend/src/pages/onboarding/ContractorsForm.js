// src/pages/onboarding/ContractorsForm.js
import React, { useMemo, useRef, useState } from "react";

function FileField({
  label,
  required,
  description,
  accept,
  multiple,
  value, // File | File[] | null
  onChange,
}) {
  const inputRef = useRef(null);

  const files = useMemo(() => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }, [value]);

  const pick = () => inputRef.current?.click();

  const removeAt = (idx) => {
    if (multiple) {
      const next = files.filter((_, i) => i !== idx);
      onChange(next);
    } else {
      onChange(null);
    }
  };

  const onInput = (e) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;

    if (multiple) {
      // merge + dedupe by name/size/lastModified
      const merged = [...files, ...picked];
      const dedup = [];
      const seen = new Set();
      for (const f of merged) {
        const k = `${f.name}|${f.size}|${f.lastModified}`;
        if (!seen.has(k)) {
          seen.add(k);
          dedup.push(f);
        }
      }
      onChange(dedup);
    } else {
      onChange(picked[0]);
    }

    // allow picking the same file again if user removed it
    e.target.value = "";
  };

  const hasFile = files.length > 0;

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={{ minWidth: 0 }}>
          <div style={styles.labelRow}>
            <h3 style={styles.cardTitle}>
              {label} {required ? <span style={styles.req}>*</span> : null}
            </h3>
            {hasFile ? <span style={styles.badgeOk}>Attached</span> : <span style={styles.badge}>Optional</span>}
          </div>
          {description ? <p style={styles.helpText}>{description}</p> : null}
        </div>

        <button type="button" onClick={pick} style={styles.pickBtn}>
          Choose file{multiple ? "s" : ""}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={onInput}
          style={{ display: "none" }}
        />
      </div>

      <div style={styles.fileArea} onClick={pick} role="button" tabIndex={0}>
        {!hasFile ? (
          <div style={styles.dropHint}>
            <div style={styles.dropTitle}>Drop files here or click to browse</div>
            <div style={styles.dropSub}>Accepted: {accept}</div>
          </div>
        ) : (
          <div style={styles.chipsWrap}>
            {files.map((f, idx) => (
              <div key={`${f.name}-${f.size}-${f.lastModified}-${idx}`} style={styles.chip}>
                <span style={styles.chipName} title={f.name}>
                  {f.name}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAt(idx);
                  }}
                  style={styles.chipX}
                  aria-label={`Remove ${f.name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ContractorsForm({ token, invite }) {
  const [cmrInsurance, setCmrInsurance] = useState(null);
  const [cmrPayment, setCmrPayment] = useState(null);
  const [euLicense, setEuLicense] = useState(null);
  const [ibanConfirmation, setIbanConfirmation] = useState(null);
  const [otherDocs, setOtherDocs] = useState([]);

  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const canSubmit =
    !!cmrInsurance && !!euLicense && !!ibanConfirmation && confirmed && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!cmrInsurance || !euLicense || !ibanConfirmation) {
      setErrorMsg("Please upload all required documents.");
      return;
    }
    if (!confirmed) {
      setErrorMsg("Please confirm that the uploaded data is complete and correct.");
      return;
    }

    try {
      setSubmitting(true);

      const fd = new FormData();

      if (invite?.carrierName) fd.append("companyName", invite.carrierName);
      if (invite?.contactEmail) fd.append("contactEmail", invite.contactEmail);

      fd.append("cmrInsurance", cmrInsurance);
      if (cmrPayment) fd.append("cmrPayment", cmrPayment);
      fd.append("euLicense", euLicense);
      fd.append("ibanConfirmation", ibanConfirmation);

      if (otherDocs?.length) {
        otherDocs.forEach((file) => fd.append("otherDocs", file));
      }

      const res = await fetch(
        `/api/onboarding/submit?token=${encodeURIComponent(token)}`,
        { method: "POST", body: fd }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Submission failed");

      setSuccessMsg("Thank you! Your documents have been submitted.");
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.h1}>Upload contractor documents</h2>
          <p style={styles.sub}>
            PDFs or images are fine. Required files are marked with{" "}
            <span style={styles.req}>*</span>.
          </p>
        </div>
        <div style={styles.progressPill}>
          <span style={{ opacity: 0.7 }}>Step</span> <strong>2</strong> <span style={{ opacity: 0.7 }}>/</span>{" "}
          <strong>2</strong>
        </div>
      </div>

      {successMsg ? <div style={{ ...styles.alert, ...styles.alertSuccess }}>{successMsg}</div> : null}
      {errorMsg ? <div style={{ ...styles.alert, ...styles.alertError }}>{errorMsg}</div> : null}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.grid}>
          <FileField
            label="CMR Insurance"
            required
            description="Upload your valid CMR insurance document (PDF/image)."
            accept=".pdf,image/*"
            multiple={false}
            value={cmrInsurance}
            onChange={setCmrInsurance}
          />

          <FileField
            label="Payment Confirmation for CMR Insurance"
            description="Optional upload of the payment confirmation."
            accept=".pdf,image/*"
            multiple={false}
            value={cmrPayment}
            onChange={setCmrPayment}
          />

          <FileField
            label="EU License"
            required
            description="Upload your EU transport license."
            accept=".pdf,image/*"
            multiple={false}
            value={euLicense}
            onChange={setEuLicense}
          />

          <FileField
            label="Bank Confirmation of your IBAN"
            required
            description="Document from your bank confirming your IBAN."
            accept=".pdf,image/*"
            multiple={false}
            value={ibanConfirmation}
            onChange={setIbanConfirmation}
          />

          <FileField
            label="Other uploads"
            description="Any additional documents (optional)."
            accept=".pdf,image/*"
            multiple
            value={otherDocs}
            onChange={setOtherDocs}
          />
        </div>

        <div style={styles.footer}>
          <label style={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              style={{ marginTop: 3 }}
            />
            <span style={{ color: "#1f2937" }}>
              I confirm that I have uploaded all required files completely and that the data is correct.
            </span>
          </label>

          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              ...styles.primaryBtn,
              opacity: canSubmit ? 1 : 0.6,
              cursor: canSubmit ? "pointer" : "not-allowed",
            }}
          >
            {submitting ? "Submitting…" : "Next"}
          </button>
        </div>
      </form>
    </div>
  );
}

const styles = {
  wrap: {
    maxWidth: 1020,
    margin: "0 auto",
    padding: "1.25rem",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "1rem",
    marginBottom: "1rem",
  },
  h1: {
    margin: 0,
    fontSize: "1.35rem",
    fontWeight: 750,
    letterSpacing: "-0.02em",
    color: "#111827",
  },
  sub: {
    margin: "0.35rem 0 0",
    color: "#6b7280",
    fontSize: "0.95rem",
  },
  progressPill: {
    border: "1px solid #e5e7eb",
    background: "#fff",
    borderRadius: 999,
    padding: "0.35rem 0.65rem",
    fontSize: "0.9rem",
    color: "#111827",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    whiteSpace: "nowrap",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "1rem",
  },
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: "1rem",
    background: "linear-gradient(180deg, #ffffff 0%, #fbfbfd 100%)",
    boxShadow: "0 1px 2px rgba(16,24,40,0.06)",
  },
  cardHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "0.75rem",
    marginBottom: "0.75rem",
  },
  labelRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    flexWrap: "wrap",
  },
  cardTitle: {
    margin: 0,
    fontSize: "1rem",
    fontWeight: 700,
    color: "#111827",
  },
  req: { color: "#e11d48", fontWeight: 800 },
  helpText: {
    margin: "0.25rem 0 0",
    fontSize: "0.9rem",
    color: "#6b7280",
    lineHeight: 1.35,
  },
  pickBtn: {
    border: "1px solid #e5e7eb",
    background: "#fff",
    borderRadius: 10,
    padding: "0.45rem 0.75rem",
    fontWeight: 650,
    fontSize: "0.9rem",
    color: "#111827",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    cursor: "pointer",
    flexShrink: 0,
  },
  fileArea: {
    border: "1px dashed #d1d5db",
    borderRadius: 12,
    padding: "0.9rem",
    background: "#fff",
    cursor: "pointer",
  },
  dropHint: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  dropTitle: { fontWeight: 650, color: "#111827" },
  dropSub: { fontSize: "0.85rem", color: "#6b7280" },
  chipsWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
  },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.45rem",
    maxWidth: "100%",
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    background: "#f9fafb",
    padding: "0.35rem 0.6rem",
  },
  chipName: {
    maxWidth: 260,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "0.9rem",
    color: "#111827",
  },
  chipX: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "1.1rem",
    lineHeight: 1,
    color: "#6b7280",
  },
  badge: {
    fontSize: "0.75rem",
    padding: "0.15rem 0.5rem",
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    color: "#6b7280",
    background: "#fff",
  },
  badgeOk: {
    fontSize: "0.75rem",
    padding: "0.15rem 0.5rem",
    borderRadius: 999,
    border: "1px solid #bbf7d0",
    color: "#166534",
    background: "#f0fdf4",
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
    marginTop: "0.25rem",
    borderTop: "1px solid #f1f5f9",
    paddingTop: "1rem",
  },
  checkboxRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.6rem",
    maxWidth: 700,
  },
  primaryBtn: {
    padding: "0.7rem 1.25rem",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.08)",
    background: "#e6007a",
    color: "white",
    fontWeight: 800,
    fontSize: "0.95rem",
    boxShadow: "0 8px 18px rgba(230,0,122,0.22)",
  },
  alert: {
    padding: "0.85rem 1rem",
    borderRadius: 12,
    fontSize: "0.95rem",
    border: "1px solid transparent",
  },
  alertSuccess: {
    background: "#f0fdf4",
    borderColor: "#bbf7d0",
    color: "#166534",
  },
  alertError: {
    background: "#fef2f2",
    borderColor: "#fecaca",
    color: "#991b1b",
  },
};
