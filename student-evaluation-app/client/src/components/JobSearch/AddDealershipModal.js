// AddDealershipModal — student creates a new DealerApplication.
// Autocompletes against the master Dealership directory if matches exist;
// otherwise the student types fresh dealer info. The student NEVER writes to
// the master directory — they only optionally link to a master record so the
// alumni panel can populate later.

import React, { useEffect, useRef, useState } from 'react';
import api from './jobSearchApi';

const initialState = {
  linkedDealership: null,
  dealerName: '',
  dealerCity: '',
  dealerState: '',
  dealerAddress: '',
  dealerWebsite: '',
  dealerMainPhone: '',
};

const AddDealershipModal = ({ open, onClose, onCreated, targetStudentId, targetStudentName }) => {
  const [form, setForm] = useState(initialState);
  const [matches, setMatches] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef(null);
  const nameInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setForm(initialState);
      setMatches([]);
      setError('');
      setTimeout(() => nameInputRef.current && nameInputRef.current.focus(), 50);
    }
  }, [open]);

  // Debounced master-directory search by name. Read-only for the student.
  useEffect(() => {
    if (!open) return undefined;
    if (!form.dealerName || form.dealerName.length < 2) {
      setMatches([]);
      return undefined;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const list = await api.searchDealerships(form.dealerName);
        setMatches(list.slice(0, 5));
      } catch (e) {
        // Silent — autocomplete is a nice-to-have. Failing here doesn't block creation.
        setMatches([]);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [form.dealerName, open]);

  const linkMatch = (dealer) => {
    setForm({
      linkedDealership: dealer._id,
      dealerName: dealer.name || '',
      dealerCity: dealer.city || '',
      dealerState: dealer.state || '',
      dealerAddress: dealer.address || '',
      dealerWebsite: dealer.website || '',
      dealerMainPhone: dealer.mainPhone || '',
    });
    setMatches([]);
  };

  const onChange = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.dealerName.trim()) {
      setError('Dealership name is required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const created = await api.createApplication(
        { ...form, dealerName: form.dealerName.trim() },
        targetStudentId || null
      );
      onCreated && onCreated(created);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create application.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;
  return (
    <>
      <div className="js-panel-backdrop" onClick={onClose} />
      <div className="js-panel" role="dialog" aria-label="Add dealership">
        <div className="js-panel-header">
          <h3>{targetStudentId ? `Add a dealership for ${targetStudentName || 'student'}` : 'Add a dealership'}</h3>
          <button type="button" className="js-panel-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        {targetStudentId && (
          <div className="js-panel-staff-banner">
            Staff mode — this dealership will be added to <strong>{targetStudentName}</strong>'s list.
          </div>
        )}
        <div className="js-panel-body">
          <form onSubmit={submit}>
            <div style={{ background: '#eff6ff', color: '#1e3a8a', padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
              Dealerships are shared across all students. Type a name to see if another
              student has already added it — pick from the list to avoid duplicates.
              Your contacts and notes stay private to you.
            </div>
            <div className="js-form-row">
              <label htmlFor="dlr-name">Dealership name *</label>
              <input
                id="dlr-name"
                ref={nameInputRef}
                type="text"
                value={form.dealerName}
                onChange={onChange('dealerName')}
                placeholder="Start typing — e.g. Mercedes-Benz of Salt Lake City"
                autoComplete="off"
                disabled={!!form.linkedDealership}
              />
              {matches.length > 0 && !form.linkedDealership && (
                <div style={{ marginTop: 8, fontSize: 13, color: '#4b5563' }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    Found in shared directory — pick one to use it:
                  </div>
                  {matches.map((m) => (
                    <button
                      key={m._id}
                      type="button"
                      className="js-btn sm"
                      style={{ display: 'block', marginTop: 4, width: '100%', textAlign: 'left' }}
                      onClick={() => linkMatch(m)}
                    >
                      {m.name}{m.city ? `, ${m.city}` : ''}{m.state ? `, ${m.state}` : ''}
                    </button>
                  ))}
                </div>
              )}
              {!form.linkedDealership && form.dealerName.trim().length >= 2 && matches.length === 0 && (
                <div style={{ marginTop: 6, fontSize: 12, color: '#92400e', background: '#fef3c7', padding: 6, borderRadius: 4 }}>
                  No existing match. Submitting will create a new shared dealership.
                </div>
              )}
              {form.linkedDealership && (
                <div style={{ marginTop: 8, fontSize: 13, color: '#047857', background: '#d1fae5', padding: 8, borderRadius: 6 }}>
                  ✓ Linked to <strong>{form.dealerName}</strong>{form.dealerCity ? `, ${form.dealerCity}` : ''}{form.dealerState ? `, ${form.dealerState}` : ''}.{' '}
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, linkedDealership: null })}
                    className="js-btn sm"
                    style={{ marginLeft: 6 }}
                  >
                    Unlink / pick different
                  </button>
                </div>
              )}
            </div>

            <div className="js-form-grid cols-2">
              <div className="js-form-row">
                <label htmlFor="dlr-city">City</label>
                <input id="dlr-city" type="text" value={form.dealerCity} onChange={onChange('dealerCity')} />
              </div>
              <div className="js-form-row">
                <label htmlFor="dlr-state">State</label>
                <input id="dlr-state" type="text" value={form.dealerState} onChange={onChange('dealerState')} />
              </div>
            </div>
            <div className="js-form-row">
              <label htmlFor="dlr-address">Address</label>
              <input id="dlr-address" type="text" value={form.dealerAddress} onChange={onChange('dealerAddress')} />
            </div>
            <div className="js-form-grid cols-2">
              <div className="js-form-row">
                <label htmlFor="dlr-web">Website</label>
                <input
                  id="dlr-web"
                  type="url"
                  value={form.dealerWebsite}
                  onChange={onChange('dealerWebsite')}
                  placeholder="https://..."
                />
              </div>
              <div className="js-form-row">
                <label htmlFor="dlr-phone">Main phone</label>
                <input id="dlr-phone" type="tel" value={form.dealerMainPhone} onChange={onChange('dealerMainPhone')} />
              </div>
            </div>

            {error && (
              <div style={{ color: '#b91c1c', fontSize: 14, marginBottom: 10 }} role="alert">
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" className="js-btn" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="js-btn primary" disabled={submitting}>
                {submitting ? 'Adding…' : 'Add dealership'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default AddDealershipModal;
