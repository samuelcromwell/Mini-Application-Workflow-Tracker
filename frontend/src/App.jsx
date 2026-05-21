import { useEffect, useMemo, useState } from "react";

import {
  createApplication,
  listApplications,
  recordDecision,
  startReview,
  submitApplication,
  updateApplication,
} from "./api";
import { APPLICATION_TYPES, DECISION_OPTIONS, STATUSES } from "./constants";
import "./styles.css";

const emptyForm = {
  applicant_name: "",
  applicant_email: "",
  company_name: "",
  application_type: APPLICATION_TYPES[0],
  description: "",
};

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusClass(status) {
  return status.toLowerCase().replaceAll(" ", "-");
}

function ApplicationForm({ application, onCancel, onSaved }) {
  const [form, setForm] = useState(application || emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(application || emptyForm);
    setError("");
  }, [application]);

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      const saved = application
        ? await updateApplication(application.id, form)
        : await createApplication(form);
      onSaved(saved);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="panel form-panel" onSubmit={handleSubmit}>
      <div className="panel-header">
        <div>
          <p className="eyebrow">{application ? "Edit application" : "New draft"}</p>
          <h2>{application ? application.tracking_number : "Create application draft"}</h2>
        </div>
        <button className="ghost-button" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>

      {error && <p className="alert">{error}</p>}

      <div className="form-grid">
        <label>
          Applicant name
          <input
            name="applicant_name"
            value={form.applicant_name}
            onChange={updateField}
            required
          />
        </label>
        <label>
          Applicant email
          <input
            name="applicant_email"
            type="email"
            value={form.applicant_email}
            onChange={updateField}
            required
          />
        </label>
        <label>
          Company name
          <input
            name="company_name"
            value={form.company_name}
            onChange={updateField}
            required
          />
        </label>
        <label>
          Application type
          <select
            name="application_type"
            value={form.application_type}
            onChange={updateField}
            required
          >
            {APPLICATION_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        Description
        <textarea
          name="description"
          value={form.description}
          onChange={updateField}
          rows="6"
          required
        />
      </label>

      <div className="form-actions">
        <button className="primary-button" type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save draft"}
        </button>
      </div>
    </form>
  );
}

function DecisionForm({ application, onDecision }) {
  const [status, setStatus] = useState(STATUSES.APPROVED);
  const [reviewerComment, setReviewerComment] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      const updated = await recordDecision(application.id, {
        status,
        reviewer_comment: reviewerComment,
      });
      setReviewerComment("");
      setStatus(STATUSES.APPROVED);
      onDecision(updated);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="decision-form" onSubmit={handleSubmit}>
      <h3>Reviewer decision</h3>
      {error && <p className="alert">{error}</p>}
      <label>
        Decision
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          {DECISION_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label>
        Comment
        <textarea
          value={reviewerComment}
          onChange={(event) => setReviewerComment(event.target.value)}
          rows="4"
          placeholder="Required for Need More Information or Rejected"
        />
      </label>
      <button className="primary-button" type="submit" disabled={saving}>
        {saving ? "Recording..." : "Record decision"}
      </button>
    </form>
  );
}

function ApplicationDetail({ application, onEdit, onChanged }) {
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState("");

  if (!application) {
    return (
      <section className="panel empty-state">
        <p className="eyebrow">No application selected</p>
        <h2>Select an application to view details.</h2>
      </section>
    );
  }

  async function runAction(actionName, action) {
    setError("");
    setBusyAction(actionName);

    try {
      const updated = await action(application.id);
      onChanged(updated);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setBusyAction("");
    }
  }

  const canEdit =
    application.status === STATUSES.DRAFT ||
    application.status === STATUSES.NEED_MORE_INFORMATION;
  const canSubmit = canEdit;
  const canStartReview = application.status === STATUSES.SUBMITTED;
  const canDecide = application.status === STATUSES.UNDER_REVIEW;

  return (
    <section className="panel detail-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Application detail</p>
          <h2>{application.tracking_number}</h2>
        </div>
        <span className={`status-pill ${statusClass(application.status)}`}>
          {application.status}
        </span>
      </div>

      {error && <p className="alert">{error}</p>}

      <dl className="detail-grid">
        <div>
          <dt>Applicant</dt>
          <dd>{application.applicant_name}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{application.applicant_email}</dd>
        </div>
        <div>
          <dt>Company</dt>
          <dd>{application.company_name}</dd>
        </div>
        <div>
          <dt>Type</dt>
          <dd>{application.application_type}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{formatDate(application.created_at)}</dd>
        </div>
        <div>
          <dt>Submitted</dt>
          <dd>{formatDate(application.submitted_at)}</dd>
        </div>
        <div>
          <dt>Reviewed</dt>
          <dd>{formatDate(application.reviewed_at)}</dd>
        </div>
      </dl>

      <div className="description-block">
        <h3>Description</h3>
        <p>{application.description}</p>
      </div>

      {application.reviewer_comment && (
        <div className="comment-block">
          <h3>Reviewer comment</h3>
          <p>{application.reviewer_comment}</p>
        </div>
      )}

      <div className="action-row">
        {canEdit && (
          <button className="secondary-button" type="button" onClick={() => onEdit(application)}>
            Edit
          </button>
        )}
        {canSubmit && (
          <button
            className="primary-button"
            type="button"
            disabled={busyAction === "submit"}
            onClick={() => runAction("submit", submitApplication)}
          >
            {application.status === STATUSES.NEED_MORE_INFORMATION ? "Resubmit" : "Submit"}
          </button>
        )}
        {canStartReview && (
          <button
            className="primary-button"
            type="button"
            disabled={busyAction === "review"}
            onClick={() => runAction("review", startReview)}
          >
            Start review
          </button>
        )}
      </div>

      {canDecide && <DecisionForm application={application} onDecision={onChanged} />}
    </section>
  );
}

function ApplicationList({ applications, selectedId, onSelect }) {
  if (applications.length === 0) {
    return <p className="muted">No applications yet.</p>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Tracking number</th>
            <th>Applicant</th>
            <th>Company</th>
            <th>Type</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((application) => (
            <tr
              key={application.id}
              className={selectedId === application.id ? "selected-row" : ""}
              onClick={() => onSelect(application)}
            >
              <td>{application.tracking_number}</td>
              <td>{application.applicant_name}</td>
              <td>{application.company_name}</td>
              <td>{application.application_type}</td>
              <td>
                <span className={`status-pill ${statusClass(application.status)}`}>
                  {application.status}
                </span>
              </td>
              <td>{formatDate(application.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function App() {
  const [applications, setApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [mode, setMode] = useState("detail");
  const [editingApplication, setEditingApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadApplications() {
    setError("");
    setLoading(true);

    try {
      const data = await listApplications();
      setApplications(data);
      setSelectedApplication((current) => {
        if (!current) {
          return data[0] || null;
        }
        return data.find((application) => application.id === current.id) || data[0] || null;
      });
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadApplications();
  }, []);

  function upsertApplication(application) {
    setApplications((current) => {
      const exists = current.some((item) => item.id === application.id);
      if (!exists) {
        return [application, ...current];
      }
      return current.map((item) => (item.id === application.id ? application : item));
    });
    setSelectedApplication(application);
    setEditingApplication(null);
    setMode("detail");
  }

  const selectedId = selectedApplication?.id;
  const summary = useMemo(
    () => ({
      total: applications.length,
      drafts: applications.filter((item) => item.status === STATUSES.DRAFT).length,
      review: applications.filter((item) => item.status === STATUSES.UNDER_REVIEW).length,
    }),
    [applications],
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Workflow tracker</p>
          <h1>Application Workflow Tracker</h1>
        </div>
        <button
          className="primary-button"
          type="button"
          onClick={() => {
            setEditingApplication(null);
            setMode("form");
          }}
        >
          New draft
        </button>
      </header>

      <section className="metric-row" aria-label="Application summary">
        <div>
          <span>{summary.total}</span>
          <p>Total</p>
        </div>
        <div>
          <span>{summary.drafts}</span>
          <p>Drafts</p>
        </div>
        <div>
          <span>{summary.review}</span>
          <p>Under review</p>
        </div>
      </section>

      {error && <p className="alert">{error}</p>}

      <main className="workspace">
        <section className="panel list-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Applications</p>
              <h2>Queue</h2>
            </div>
            <button className="ghost-button" type="button" onClick={loadApplications}>
              Refresh
            </button>
          </div>
          {loading ? (
            <p className="muted">Loading applications...</p>
          ) : (
            <ApplicationList
              applications={applications}
              selectedId={selectedId}
              onSelect={(application) => {
                setSelectedApplication(application);
                setMode("detail");
              }}
            />
          )}
        </section>

        {mode === "form" ? (
          <ApplicationForm
            application={editingApplication}
            onCancel={() => setMode("detail")}
            onSaved={upsertApplication}
          />
        ) : (
          <ApplicationDetail
            application={selectedApplication}
            onEdit={(application) => {
              setEditingApplication(application);
              setMode("form");
            }}
            onChanged={upsertApplication}
          />
        )}
      </main>
    </div>
  );
}

export default App;
