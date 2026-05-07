// DealerApplicationPanel — slide-in detail/edit view for a single
// DealerApplication. Five tabs: Overview, Contacts, Communications,
// Benefits, Notes. Mobile-first: full-screen on small viewports, side
// drawer on >= 992px (CSS-driven, see JobSearch.css).
//
// Responsibility split:
//   - This file owns the panel shell, tab nav, and persisting "save" calls.
//   - Each tab body lives in this same file as a small subcomponent so the
//     component is easy to reason about. (We can split files later if it
//     becomes unwieldy, but right now keeping them together makes diffs
//     and tests simpler.)

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from './jobSearchApi';
import YnButtons from './YnButtons';

const TABS = ['Overview', 'Contacts', 'Communications', 'Benefits', 'Notes'];

const COMMUNICATION_TYPES = [
  'application_submitted',
  'cover_letter_sent',
  'email_sent',
  'email_received',
  'phone',
  'text',
  'virtual_meeting',
  'in_person',
  'interview',
  'offer_received',
  'rejection',
  'other',
];
const NEXT_STEP_TYPES = [
  'none',
  'send_resume',
  'send_cover_letter',
  'submit_application',
  'follow_up_email',
  'follow_up_phone',
  'schedule_interview',
  'attend_interview',
  'send_thank_you',
  'await_response',
  'await_offer',
  'evaluate_offer',
  'other',
];
const CONTACT_ROLES = ['service_manager', 'service_director', 'shop_foreman', 'hr', 'other'];
const PREFERRED_CHANNELS = ['unknown', 'email', 'phone', 'text', 'in_person'];
const STARTING_ROLES = ['tech', 'express_lane', 'porter', 'lot_tech', 'apprentice', 'other'];

const labelize = (s) => (s ? s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '');

// ───── Overview tab ───────────────────────────────────────────────────────

const OverviewTab = ({ app, onPatch, canEdit }) => (
  <div>
    <div className="js-section-title">Dealership info</div>
    {app.linkedDealership && (
      <div style={{ background: '#eff6ff', color: '#1e3a8a', padding: 8, borderRadius: 6, fontSize: 12, marginBottom: 10 }}>
        Shared dealership — your edits to these fields update the shared
        directory and will be visible to other students using this dealer.
        Your contacts, communications, benefits, and notes stay private to you.
      </div>
    )}
    <div className="js-form-row">
      <label>Dealership name</label>
      <input
        type="text"
        value={app.dealerName || ''}
        onChange={(e) => onPatch({ dealerName: e.target.value })}
        disabled={!canEdit}
      />
    </div>
    <div className="js-form-grid cols-3">
      <div className="js-form-row">
        <label>City</label>
        <input
          type="text"
          value={app.dealerCity || ''}
          onChange={(e) => onPatch({ dealerCity: e.target.value })}
          disabled={!canEdit}
        />
      </div>
      <div className="js-form-row">
        <label>State</label>
        <input
          type="text"
          value={app.dealerState || ''}
          onChange={(e) => onPatch({ dealerState: e.target.value })}
          disabled={!canEdit}
        />
      </div>
      <div className="js-form-row">
        <label>Main phone</label>
        <input
          type="tel"
          value={app.dealerMainPhone || ''}
          onChange={(e) => onPatch({ dealerMainPhone: e.target.value })}
          disabled={!canEdit}
        />
      </div>
    </div>
    <div className="js-form-row">
      <label>Address</label>
      <input
        type="text"
        value={app.dealerAddress || ''}
        onChange={(e) => onPatch({ dealerAddress: e.target.value })}
        disabled={!canEdit}
      />
    </div>
    <div className="js-form-row">
      <label>Website</label>
      <input
        type="url"
        value={app.dealerWebsite || ''}
        onChange={(e) => onPatch({ dealerWebsite: e.target.value })}
        disabled={!canEdit}
      />
    </div>

    <div className="js-section-title">Status</div>
    <div className="js-form-grid cols-2">
      <div className="js-form-row">
        <label>Has posted/advertised job listing?</label>
        <YnButtons
          value={app.hasPostedJob || 'unknown'}
          onChange={(v) => onPatch({ hasPostedJob: v })}
          includeUnknown
        />
      </div>
      <div className="js-form-row">
        <label>Application submitted?</label>
        <YnButtons
          value={app.applicationSubmitted ? 'Y' : 'N'}
          onChange={(v) => onPatch({ applicationSubmitted: v === 'Y' })}
          options={['Y', 'N']}
        />
      </div>
      <div className="js-form-row">
        <label>Still interested?</label>
        <YnButtons
          value={app.stillInterested === false ? 'N' : 'Y'}
          onChange={(v) => onPatch({ stillInterested: v === 'Y' })}
          options={['Y', 'N']}
        />
      </div>
      <div className="js-form-row">
        <label>Park as stagnant (keep on list)</label>
        <YnButtons
          value={app.archivedAsStagnant ? 'Y' : 'N'}
          onChange={(v) => onPatch({ archivedAsStagnant: v === 'Y' })}
          options={['Y', 'N']}
        />
      </div>
    </div>

    <div className="js-section-title">Next step</div>
    <div className="js-form-grid cols-2">
      <div className="js-form-row">
        <label>What's next?</label>
        <select
          value={app.nextStepType || 'none'}
          onChange={(e) => onPatch({ nextStepType: e.target.value })}
          disabled={!canEdit}
        >
          {NEXT_STEP_TYPES.map((t) => (
            <option key={t} value={t}>{labelize(t)}</option>
          ))}
        </select>
      </div>
      <div className="js-form-row">
        <label>Notes</label>
        <input
          type="text"
          value={app.nextStepNotes || ''}
          onChange={(e) => onPatch({ nextStepNotes: e.target.value })}
          disabled={!canEdit}
          placeholder="e.g. call after Tuesday"
        />
      </div>
    </div>

    {app.followupSuggestion && (
      <div className={`js-followup ${app.followupUrgency === 'high' ? 'high' : ''}`}>
        ↻ Suggested follow-up: {app.followupSuggestion}
      </div>
    )}
  </div>
);

// ───── Contacts tab ───────────────────────────────────────────────────────

const ContactRow = ({ contact, onChange, onRemove, disabled }) => {
  const set = (key, val) => onChange({ ...contact, [key]: val });
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 10, marginBottom: 10 }}>
      <div className="js-form-grid cols-2">
        <div className="js-form-row">
          <label>First name</label>
          <input type="text" value={contact.firstName || ''} onChange={(e) => set('firstName', e.target.value)} disabled={disabled} />
        </div>
        <div className="js-form-row">
          <label>Last name</label>
          <input type="text" value={contact.lastName || ''} onChange={(e) => set('lastName', e.target.value)} disabled={disabled} />
        </div>
      </div>
      <div className="js-form-grid cols-2">
        <div className="js-form-row">
          <label>Role</label>
          <select value={contact.role || 'other'} onChange={(e) => set('role', e.target.value)} disabled={disabled}>
            {CONTACT_ROLES.map((r) => <option key={r} value={r}>{labelize(r)}</option>)}
          </select>
        </div>
        <div className="js-form-row">
          <label>Custom role label</label>
          <input
            type="text"
            value={contact.customRoleLabel || ''}
            onChange={(e) => set('customRoleLabel', e.target.value)}
            disabled={disabled || contact.role !== 'other'}
            placeholder={contact.role === 'other' ? 'e.g. Hiring Coordinator' : '(only when Role = Other)'}
          />
        </div>
      </div>
      <div className="js-form-grid cols-2">
        <div className="js-form-row">
          <label>Email</label>
          <input type="email" value={contact.email || ''} onChange={(e) => set('email', e.target.value)} disabled={disabled} />
        </div>
        <div className="js-form-row">
          <label>Phone</label>
          <input type="tel" value={contact.phone || ''} onChange={(e) => set('phone', e.target.value)} disabled={disabled} />
        </div>
      </div>
      <div className="js-form-row">
        <label>Preferred channel</label>
        <select value={contact.preferredChannel || 'unknown'} onChange={(e) => set('preferredChannel', e.target.value)} disabled={disabled}>
          {PREFERRED_CHANNELS.map((c) => <option key={c} value={c}>{labelize(c)}</option>)}
        </select>
      </div>
      <div className="js-form-row">
        <label>Notes</label>
        <textarea value={contact.notes || ''} onChange={(e) => set('notes', e.target.value)} disabled={disabled} rows={2} />
      </div>
      {!disabled && (
        <div style={{ textAlign: 'right' }}>
          <button type="button" className="js-btn sm danger" onClick={onRemove}>Remove contact</button>
        </div>
      )}
    </div>
  );
};

const ContactsTab = ({ app, onPatch, canEdit }) => {
  const contacts = app.contacts || [];
  const update = (idx, next) => {
    const copy = [...contacts];
    copy[idx] = next;
    onPatch({ contacts: copy });
  };
  const remove = (idx) => {
    const copy = [...contacts];
    copy.splice(idx, 1);
    onPatch({ contacts: copy });
  };
  const add = () =>
    onPatch({
      contacts: [
        ...contacts,
        { firstName: '', lastName: '', role: 'other', email: '', phone: '', preferredChannel: 'unknown' },
      ],
    });

  return (
    <div>
      {contacts.length === 0 && (
        <div className="js-empty" style={{ padding: 12 }}>
          No contacts yet. Add the dealership staff you've identified — service manager, service director, shop foreman, etc.
        </div>
      )}
      {contacts.map((c, idx) => (
        <ContactRow key={c._id || idx} contact={c} onChange={(n) => update(idx, n)} onRemove={() => remove(idx)} disabled={!canEdit} />
      ))}
      {canEdit && (
        <button type="button" className="js-btn primary" onClick={add}>+ Add contact</button>
      )}
    </div>
  );
};

// ───── Benefits tab ──────────────────────────────────────────────────────

const BenefitsTab = ({ app, onPatch, canEdit, canSeePay }) => {
  const benefits = app.benefits || {};
  const setB = (patch) => onPatch({ benefits: { ...benefits, ...patch } });

  return (
    <div>
      <div className="js-form-row">
        <label>Relocation offered?</label>
        <YnButtons
          value={benefits.relocation?.offered || 'unknown'}
          onChange={(v) => setB({ relocation: { ...(benefits.relocation || {}), offered: v } })}
          includeUnknown
        />
      </div>
      <div className="js-form-row">
        <label>Relocation details (amount, requirements, commitments)</label>
        <textarea
          rows={2}
          value={benefits.relocation?.details || ''}
          onChange={(e) => setB({ relocation: { ...(benefits.relocation || {}), details: e.target.value } })}
          disabled={!canEdit}
        />
      </div>

      <div className="js-form-grid cols-2">
        <div className="js-form-row">
          <label>Starting wage (visible to you & instructors only)</label>
          {canSeePay ? (
            <input
              type="number"
              step="0.01"
              value={benefits.startingWage ?? ''}
              onChange={(e) => setB({ startingWage: e.target.value === '' ? null : Number(e.target.value) })}
              disabled={!canEdit}
            />
          ) : (
            <div className="js-board-redacted">Hidden</div>
          )}
        </div>
        <div className="js-form-row">
          <label>Wage range (you & instructors only)</label>
          {canSeePay ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="number"
                step="0.01"
                placeholder="min"
                value={benefits.wageRange?.min ?? ''}
                onChange={(e) => setB({
                  wageRange: { ...(benefits.wageRange || {}), min: e.target.value === '' ? null : Number(e.target.value) },
                })}
                disabled={!canEdit}
              />
              <input
                type="number"
                step="0.01"
                placeholder="max"
                value={benefits.wageRange?.max ?? ''}
                onChange={(e) => setB({
                  wageRange: { ...(benefits.wageRange || {}), max: e.target.value === '' ? null : Number(e.target.value) },
                })}
                disabled={!canEdit}
              />
            </div>
          ) : (
            <div className="js-board-redacted">Hidden</div>
          )}
        </div>
      </div>

      <div className="js-form-grid cols-2">
        <div className="js-form-row">
          <label>Starting role</label>
          <select
            value={benefits.startingRole || 'tech'}
            onChange={(e) => setB({ startingRole: e.target.value })}
            disabled={!canEdit}
          >
            {STARTING_ROLES.map((r) => <option key={r} value={r}>{labelize(r)}</option>)}
          </select>
        </div>
        <div className="js-form-row">
          <label>Custom starting role label</label>
          <input
            type="text"
            value={benefits.customStartingRoleLabel || ''}
            onChange={(e) => setB({ customStartingRoleLabel: e.target.value })}
            disabled={!canEdit || benefits.startingRole !== 'other'}
          />
        </div>
      </div>

      <div className="js-form-row">
        <label>Pathway / timeline notes (e.g. lot tech → 3 months → main shop)</label>
        <textarea
          rows={3}
          value={benefits.pathwayNotes || ''}
          onChange={(e) => setB({ pathwayNotes: e.target.value })}
          disabled={!canEdit}
        />
      </div>

      <div className="js-form-grid cols-2">
        <div className="js-form-row">
          <label>Mentorship / apprenticeship offered?</label>
          <YnButtons
            value={benefits.mentorship?.offered ? 'Y' : 'N'}
            onChange={(v) => setB({ mentorship: { ...(benefits.mentorship || {}), offered: v === 'Y' } })}
            options={['Y', 'N']}
          />
        </div>
        <div className="js-form-row">
          <label>Length (months)</label>
          <input
            type="number"
            min="0"
            value={benefits.mentorship?.lengthMonths ?? ''}
            onChange={(e) => setB({ mentorship: { ...(benefits.mentorship || {}), lengthMonths: e.target.value === '' ? null : Number(e.target.value) } })}
            disabled={!canEdit || !benefits.mentorship?.offered}
          />
        </div>
      </div>
      <div className="js-form-row">
        <label>Mentorship details</label>
        <textarea
          rows={2}
          value={benefits.mentorship?.details || ''}
          onChange={(e) => setB({ mentorship: { ...(benefits.mentorship || {}), details: e.target.value } })}
          disabled={!canEdit}
        />
      </div>

      <div className="js-form-row">
        <label>Built-in toolboxes supplied?</label>
        <YnButtons
          value={benefits.toolboxSupplied || 'unknown'}
          onChange={(v) => setB({ toolboxSupplied: v })}
          includeUnknown
        />
      </div>

      <div className="js-form-row">
        <label>Incentives</label>
        <textarea rows={2} value={benefits.incentives || ''} onChange={(e) => setB({ incentives: e.target.value })} disabled={!canEdit} />
      </div>
      <div className="js-form-row">
        <label>Shop culture</label>
        <textarea rows={2} value={benefits.shopCulture || ''} onChange={(e) => setB({ shopCulture: e.target.value })} disabled={!canEdit} />
      </div>
    </div>
  );
};

// ───── Communications tab ────────────────────────────────────────────────

const CommunicationsTab = ({ application, canEdit, canSeePay, onApplicationChanged }) => {
  const [comms, setComms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    type: 'phone',
    occurredAt: new Date().toISOString().slice(0, 16),
    contactId: '',
    summary: '',
    offerAmount: '',
  });

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.listCommunications(application._id);
      setComms(list);
    } finally {
      setLoading(false);
    }
  }, [application._id]);

  useEffect(() => { reload(); }, [reload]);

  const startEdit = (comm) => {
    setEditingId(comm._id);
    setFormData({
      type: comm.type,
      occurredAt: comm.occurredAt ? new Date(comm.occurredAt).toISOString().slice(0, 16) : '',
      contactId: comm.contactId || '',
      summary: comm.summary || '',
      offerAmount: comm.offerAmount ?? '',
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      type: 'phone',
      occurredAt: new Date().toISOString().slice(0, 16),
      contactId: '',
      summary: '',
      offerAmount: '',
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    const contact = (application.contacts || []).find((c) => String(c._id) === String(formData.contactId));
    const payload = {
      type: formData.type,
      occurredAt: formData.occurredAt ? new Date(formData.occurredAt).toISOString() : undefined,
      contactId: formData.contactId || null,
      contactNameSnapshot: contact ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim() : undefined,
      summary: formData.summary,
      offerAmount: formData.type === 'offer_received' && formData.offerAmount !== '' ? Number(formData.offerAmount) : null,
    };
    if (editingId) {
      await api.updateCommunication(editingId, payload);
    } else {
      await api.createCommunication(application._id, payload);
    }
    cancelForm();
    await reload();
    // Refresh parent so lastEvent fields/follow-up hints update.
    const refreshed = await api.getApplication(application._id);
    onApplicationChanged && onApplicationChanged(refreshed);
  };

  const remove = async (comm) => {
    if (!window.confirm('Delete this communication?')) return;
    await api.deleteCommunication(comm._id);
    await reload();
    const refreshed = await api.getApplication(application._id);
    onApplicationChanged && onApplicationChanged(refreshed);
  };

  return (
    <div>
      {canEdit && !showForm && (
        <button type="button" className="js-btn primary" onClick={() => setShowForm(true)} style={{ marginBottom: 12 }}>
          + Log a communication
        </button>
      )}

      {showForm && (
        <form onSubmit={submit} style={{ background: '#f9fafb', padding: 12, borderRadius: 10, marginBottom: 14 }}>
          <div className="js-form-grid cols-2">
            <div className="js-form-row">
              <label>Type</label>
              <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                {COMMUNICATION_TYPES.map((t) => (
                  <option key={t} value={t}>{labelize(t)}</option>
                ))}
              </select>
            </div>
            <div className="js-form-row">
              <label>When</label>
              <input
                type="datetime-local"
                value={formData.occurredAt}
                onChange={(e) => setFormData({ ...formData, occurredAt: e.target.value })}
              />
            </div>
          </div>
          <div className="js-form-row">
            <label>Contact (optional)</label>
            <select value={formData.contactId} onChange={(e) => setFormData({ ...formData, contactId: e.target.value })}>
              <option value="">— select a contact —</option>
              {(application.contacts || []).map((c) => (
                <option key={c._id} value={c._id}>
                  {`${c.firstName || ''} ${c.lastName || ''}`.trim() || labelize(c.role)} · {labelize(c.role === 'other' ? c.customRoleLabel || 'other' : c.role)}
                </option>
              ))}
            </select>
          </div>
          <div className="js-form-row">
            <label>Summary</label>
            <textarea
              rows={3}
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              placeholder="What happened? What's the next step?"
            />
          </div>
          {formData.type === 'offer_received' && canSeePay && (
            <div className="js-form-row">
              <label>Offer amount (visible to you & instructors only)</label>
              <input
                type="number"
                step="0.01"
                value={formData.offerAmount}
                onChange={(e) => setFormData({ ...formData, offerAmount: e.target.value })}
              />
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="js-btn" onClick={cancelForm}>Cancel</button>
            <button type="submit" className="js-btn primary">{editingId ? 'Save changes' : 'Log it'}</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="js-loading">Loading communications…</div>
      ) : comms.length === 0 ? (
        <div className="js-empty">No communications yet.</div>
      ) : (
        <div className="js-timeline">
          {comms.map((c) => {
            const cls = ['js-timeline-item'];
            if (c.type === 'offer_received') cls.push('offer');
            if (c.type === 'interview') cls.push('interview');
            if (c.type === 'rejection') cls.push('rejection');
            return (
              <div key={c._id} className={cls.join(' ')}>
                <div className="js-timeline-when">
                  {c.occurredAt ? new Date(c.occurredAt).toLocaleString() : '—'}
                </div>
                <div className="js-timeline-type">{labelize(c.type)}{c.contactNameSnapshot ? ` · ${c.contactNameSnapshot}` : ''}</div>
                {c.summary && <div className="js-timeline-summary">{c.summary}</div>}
                {c.type === 'offer_received' && (
                  <div style={{ marginTop: 4, fontSize: 13 }}>
                    {c.offerAmount != null
                      ? <strong>Offer: ${Number(c.offerAmount).toLocaleString()}</strong>
                      : <span className="js-board-redacted">Offer amount hidden</span>}
                  </div>
                )}
                {canEdit && (
                  <div className="js-timeline-actions">
                    <button type="button" className="js-btn sm" onClick={() => startEdit(c)}>Edit</button>
                    <button type="button" className="js-btn sm danger" onClick={() => remove(c)}>Delete</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ───── Notes tab ─────────────────────────────────────────────────────────

const NotesTab = ({ app, onPatch, canEdit }) => (
  <div>
    <div className="js-form-row">
      <label>Notes</label>
      <textarea
        rows={10}
        value={app.notes || ''}
        onChange={(e) => onPatch({ notes: e.target.value })}
        disabled={!canEdit}
      />
    </div>
  </div>
);

// ───── Panel shell ───────────────────────────────────────────────────────

const DealerApplicationPanel = ({ applicationId, user, impersonatingStudent, onClose, onUpdated, onDeleted }) => {
  const [app, setApp] = useState(null);
  const [tab, setTab] = useState('Overview');
  const [pendingPatch, setPendingPatch] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.getApplication(applicationId).then((a) => { if (!cancelled) setApp(a); });
    return () => { cancelled = true; };
  }, [applicationId]);

  const isOwner = useMemo(() => {
    if (!app || !user) return false;
    const ownerId = app.student?._id || app.student;
    return String(ownerId) === String(user._id);
  }, [app, user]);

  const isStaff = !!user && (user.role === 'instructor' || user.role === 'admin');
  // Both owner and staff can edit. canEdit gates form inputs/buttons; the
  // server independently enforces the same rule via loadOwnedApplication.
  const canEdit = isOwner || isStaff;
  const canSeePay = isOwner || isStaff;

  // Optimistic local update + dirty tracking — saves to server when user clicks Save or
  // closes the panel. Avoids hammering the API on every keystroke.
  const onPatch = useCallback((patch) => {
    setApp((cur) => ({ ...cur, ...patch }));
    setPendingPatch((p) => ({ ...(p || {}), ...patch }));
  }, []);

  const save = useCallback(async () => {
    if (!pendingPatch || !canEdit) return;
    setSaving(true);
    setError('');
    try {
      const updated = await api.updateApplication(app._id, pendingPatch);
      setApp(updated);
      setPendingPatch(null);
      onUpdated && onUpdated(updated);
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [pendingPatch, canEdit, app, onUpdated]);

  const close = async () => {
    if (pendingPatch && canEdit) {
      // Three-way prompt:
      //  - OK   → save & close
      //  - Cancel → keep panel open (don't close, don't discard)
      // For "discard & close" the user can hit the explicit Discard button.
      const wantsToSave = window.confirm(
        'You have unsaved changes. Click OK to save them now, or Cancel to keep editing.'
      );
      if (!wantsToSave) return;
      try {
        const updated = await api.updateApplication(app._id, pendingPatch);
        onUpdated && onUpdated(updated);
      } catch {
        if (!window.confirm('Save failed. Close anyway and discard your changes?')) return;
      }
    }
    onClose();
  };

  const discardAndClose = () => {
    if (!window.confirm('Discard your unsaved changes and close?')) return;
    setPendingPatch(null);
    onClose();
  };

  // Browser-level guard: warn on tab close, refresh, or external navigation
  // while there are unsaved changes. Modern browsers ignore the message text
  // and show a generic "Leave site?" dialog — that's fine, the prompt itself
  // is what we need.
  useEffect(() => {
    if (!pendingPatch) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [pendingPatch]);

  const deleteApp = async () => {
    if (!canEdit) return;
    if (!window.confirm(`Delete ${app.dealerName}?`)) return;
    await api.deleteApplication(app._id);
    onDeleted && onDeleted(app._id);
  };

  const ownerLabel = useMemo(() => {
    if (!app) return '';
    // Prefer the impersonatingStudent prop (passed by MyJobSearch when staff
    // drilled in via the URL), else fall back to whatever the API populated.
    const s = impersonatingStudent || app.student;
    if (!s || typeof s === 'string') return '';
    const full = [s.firstName, s.lastName].filter(Boolean).join(' ').trim();
    return full || s.username || '';
  }, [app, impersonatingStudent]);

  if (!app) {
    return (
      <>
        <div className="js-panel-backdrop" onClick={onClose} />
        <div className="js-panel">
          <div className="js-loading">Loading…</div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="js-panel-backdrop" onClick={close} />
      <div className="js-panel" role="dialog" aria-label="Application details">
        <div className="js-panel-header">
          <h3>{app.dealerName}</h3>
          {pendingPatch && canEdit && (
            <>
              <button
                type="button"
                className="js-btn primary sm js-btn-dance"
                onClick={save}
                disabled={saving}
              >
                {saving ? 'Saving…' : '● Save'}
              </button>
              <button type="button" className="js-btn sm" onClick={discardAndClose} disabled={saving}>
                Discard
              </button>
            </>
          )}
          <a
            className="js-btn sm"
            href={api.timelinePdfUrl(app._id) + `?token=${localStorage.getItem('token')}`}
            onClick={(e) => {
              // Browsers can't easily set Authorization header on file links, so we fetch
              // the PDF, build a blob URL, and trigger a download.
              e.preventDefault();
              const url = api.timelinePdfUrl(app._id);
              fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
                .then((r) => r.blob())
                .then((blob) => {
                  const blobUrl = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = blobUrl;
                  a.download = `timeline_${app._id}.pdf`;
                  a.click();
                  setTimeout(() => window.URL.revokeObjectURL(blobUrl), 0);
                });
            }}
          >PDF</a>
          <button type="button" className="js-panel-close" onClick={close} aria-label="Close">×</button>
        </div>
        <div className="js-panel-tabs">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              className={`js-panel-tab ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        {/* Staff impersonation banner — visible whenever a non-owner staff
            member is editing; spell out whose record this is so an instructor
            can never accidentally edit the wrong person's data. */}
        {!isOwner && isStaff && (
          <div className="js-panel-staff-banner">
            Staff edit mode — you are editing <strong>{ownerLabel || 'a student'}</strong>'s application.
          </div>
        )}
        {!canEdit && (
          <div style={{ background: '#eff6ff', color: '#1e40af', padding: 8, fontSize: 13, textAlign: 'center' }}>
            Read-only view. Pay info is hidden.
          </div>
        )}
        {error && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: 8, fontSize: 14 }}>{error}</div>
        )}
        <div className="js-panel-body">
          {tab === 'Overview' && <OverviewTab app={app} onPatch={onPatch} canEdit={canEdit} />}
          {tab === 'Contacts' && <ContactsTab app={app} onPatch={onPatch} canEdit={canEdit} />}
          {tab === 'Communications' && (
            <CommunicationsTab
              application={app}
              canEdit={canEdit}
              canSeePay={canSeePay}
              onApplicationChanged={(refreshed) => { setApp(refreshed); onUpdated && onUpdated(refreshed); }}
            />
          )}
          {tab === 'Benefits' && <BenefitsTab app={app} onPatch={onPatch} canEdit={canEdit} canSeePay={canSeePay} />}
          {tab === 'Notes' && <NotesTab app={app} onPatch={onPatch} canEdit={canEdit} />}

          {canEdit && (
            <div style={{ marginTop: 24, paddingTop: 14, borderTop: '1px solid #e5e7eb' }}>
              <button type="button" className="js-btn danger" onClick={deleteApp}>Delete this application</button>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                Hard-deletes the application and its communications. Use "Park as stagnant" instead if you want to keep the row.
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DealerApplicationPanel;
