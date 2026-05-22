import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  createApplication,
  getApplication,
  listApplications,
  recordDecision,
  startReview,
  submitApplication,
  updateApplication,
} from "./api";
import { APPLICATION_TYPES, DECISION_OPTIONS, STATUSES } from "./constants";
import "./styles.css";

const STATUS_ORDER = [
  STATUSES.DRAFT,
  STATUSES.SUBMITTED,
  STATUSES.UNDER_REVIEW,
  STATUSES.APPROVED,
];

const FILTER_OPTIONS = [
  { id: "all", label: "All" },
  { id: STATUSES.DRAFT, label: "Draft" },
  { id: STATUSES.SUBMITTED, label: "Submitted" },
  { id: STATUSES.UNDER_REVIEW, label: "Under review" },
  { id: STATUSES.NEED_MORE_INFORMATION, label: "Need info" },
  { id: STATUSES.APPROVED, label: "Approved" },
  { id: STATUSES.REJECTED, label: "Rejected" },
];

const emptyForm = {
  applicant_name: "",
  applicant_email: "",
  company_name: "",
  application_type: APPLICATION_TYPES[0],
  description: "",
};

function statusClass(status) {
  return `status-${status.toLowerCase().replaceAll(" ", "-")}`;
}

function formatDate(value, withTime = true) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
  }).format(new Date(value));
}

function relativeTime(value) {
  if (!value) return "";
  const diff = (Date.now() - new Date(value).getTime()) / 1000;
  const units = [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [name, seconds] of units) {
    const value = Math.floor(diff / seconds);
    if (value >= 1) return `${value} ${name}${value > 1 ? "s" : ""} ago`;
  }
  return "just now";
}

function StatusPill({ status }) {
  return <span className={`status-pill ${statusClass(status)}`}>{status}</span>;
}

function WorkflowStepper({ status }) {
  const isTerminalReject = status === STATUSES.REJECTED;
  const isNeedMore = status === STATUSES.NEED_MORE_INFORMATION;

  const currentIndex = (() => {
    if (status === STATUSES.DRAFT) return 0;
    if (status === STATUSES.SUBMITTED) return 1;
    if (status === STATUSES.UNDER_REVIEW || isNeedMore) return 2;
    return 3;
  })();

  return (
    <ol className="stepper" aria-label="Workflow progress">
      {STATUS_ORDER.map((step, index) => {
        const isComplete = index < currentIndex;
        const isCurrent = index === currentIndex;
        const label =
          index === 3 && isTerminalReject
            ? "Rejected"
            : index === 3 && isNeedMore
              ? "Awaiting info"
              : step;
        return (
          <li
            key={step}
            className={`stepper-step ${isComplete ? "is-complete" : ""} ${
              isCurrent ? "is-current" : ""
            } ${isTerminalReject && index === 3 ? "is-rejected" : ""} ${
              isNeedMore && index === 3 ? "is-pending" : ""
            }`}
          >
            <span className="stepper-bullet">{index + 1}</span>
            <span className="stepper-label">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function Skeleton({ rows = 4 }) {
  return (
    <div className="skeleton-wrap" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="skeleton-row" />
      ))}
    </div>
  );
}

function Modal({ title, subtitle, onClose, children }) {
  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <div className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div>
            {subtitle && <p className="eyebrow">{subtitle}</p>}
            <h2>{title}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.tone}`}>
          <div>
            <strong>{toast.title}</strong>
            {toast.message && <p>{toast.message}</p>}
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Dismiss"
            onClick={() => onDismiss(toast.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

function ApplicationForm({ initial, mode, onClose, onSaved, onError }) {
  const [form, setForm] = useState(initial || emptyForm);
  const [saving, setSaving] = useState(false);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const saved =
        mode === "edit"
          ? await updateApplication(initial.id, form)
          : await createApplication(form);
      onSaved(saved, mode);
    } catch (apiError) {
      onError(apiError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="stack-md" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label>
          Applicant name
          <input
            name="applicant_name"
            value={form.applicant_name}
            onChange={updateField}
            required
            autoFocus
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
          rows="5"
          value={form.description}
          onChange={updateField}
          placeholder="Briefly describe the request, supporting context, and any prior tracking numbers."
          required
        />
      </label>
      <div className="form-actions">
        <button type="button" className="ghost-button" onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="primary-button" disabled={saving}>
          {saving ? "Saving…" : mode === "edit" ? "Save changes" : "Create draft"}
        </button>
      </div>
    </form>
  );
}

function DecisionForm({ application, onClose, onSaved, onError }) {
  const [status, setStatus] = useState(STATUSES.APPROVED);
  const [reviewerComment, setReviewerComment] = useState("");
  const [saving, setSaving] = useState(false);

  const commentRequired =
    status === STATUSES.NEED_MORE_INFORMATION || status === STATUSES.REJECTED;

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = await recordDecision(application.id, {
        status,
        reviewer_comment: reviewerComment,
      });
      onSaved(updated);
    } catch (apiError) {
      onError(apiError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="stack-md" onSubmit={handleSubmit}>
      <fieldset className="decision-options" aria-label="Decision">
        {DECISION_OPTIONS.map((option) => (
          <label
            key={option}
            className={`decision-chip ${status === option ? "is-active" : ""} ${statusClass(
              option,
            )}`}
          >
            <input
              type="radio"
              name="decision"
              value={option}
              checked={status === option}
              onChange={(event) => setStatus(event.target.value)}
            />
            <span>{option}</span>
          </label>
        ))}
      </fieldset>
      <label>
        Reviewer comment {commentRequired && <span className="required">*</span>}
        <textarea
          rows="5"
          value={reviewerComment}
          onChange={(event) => setReviewerComment(event.target.value)}
          placeholder={
            commentRequired
              ? "Required: explain what is missing or why the application is rejected."
              : "Optional notes for the applicant."
          }
          required={commentRequired}
        />
      </label>
      <div className="form-actions">
        <button type="button" className="ghost-button" onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="primary-button" disabled={saving}>
          {saving ? "Recording…" : "Record decision"}
        </button>
      </div>
    </form>
  );
}

function ApplicationDetail({
  application,
  busyAction,
  onEdit,
  onSubmit,
  onStartReview,
  onOpenDecision,
}) {
  if (!application) {
    return (
      <section className="panel empty-detail">
        <div className="empty-icon">📄</div>
        <h2>Select an application</h2>
        <p className="muted">
          Pick a row on the left to see its details, or create a new draft to get started.
        </p>
      </section>
    );
  }

  const canEdit =
    application.status === STATUSES.DRAFT ||
    application.status === STATUSES.NEED_MORE_INFORMATION;
  const canSubmit = canEdit;
  const canStartReview = application.status === STATUSES.SUBMITTED;
  const canDecide = application.status === STATUSES.UNDER_REVIEW;
  const isTerminal =
    application.status === STATUSES.APPROVED || application.status === STATUSES.REJECTED;

  return (
    <section className="panel detail-panel">
      <header className="detail-header">
        <div>
          <p className="eyebrow">Application</p>
          <h2 className="mono">{application.tracking_number}</h2>
          <p className="muted small">Created {relativeTime(application.created_at)}</p>
        </div>
        <StatusPill status={application.status} />
      </header>

      <WorkflowStepper status={application.status} />

      <dl className="detail-grid">
        <div>
          <dt>Applicant</dt>
          <dd>{application.applicant_name}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>
            <a href={`mailto:${application.applicant_email}`}>{application.applicant_email}</a>
          </dd>
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
          <dt>Submitted</dt>
          <dd>{formatDate(application.submitted_at)}</dd>
        </div>
        <div>
          <dt>Reviewed</dt>
          <dd>{formatDate(application.reviewed_at)}</dd>
        </div>
      </dl>

      <div className="section">
        <h3>Description</h3>
        <p className="prose">{application.description}</p>
      </div>

      {application.reviewer_comment && (
        <div className={`section reviewer-block ${statusClass(application.status)}`}>
          <h3>Reviewer comment</h3>
          <p className="prose">{application.reviewer_comment}</p>
        </div>
      )}

      {isTerminal ? (
        <div className={`terminal-banner ${statusClass(application.status)}`}>
          This application is <strong>{application.status.toLowerCase()}</strong> and can no
          longer be edited.
        </div>
      ) : (
        <div className="action-row">
          {canEdit && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => onEdit(application)}
            >
              Edit
            </button>
          )}
          {canSubmit && (
            <button
              type="button"
              className="primary-button"
              disabled={busyAction === "submit"}
              onClick={() => onSubmit(application)}
            >
              {busyAction === "submit"
                ? "Submitting…"
                : application.status === STATUSES.NEED_MORE_INFORMATION
                  ? "Resubmit"
                  : "Submit"}
            </button>
          )}
          {canStartReview && (
            <button
              type="button"
              className="primary-button"
              disabled={busyAction === "review"}
              onClick={() => onStartReview(application)}
            >
              {busyAction === "review" ? "Starting review…" : "Start review"}
            </button>
          )}
          {canDecide && (
            <>
              <button
                type="button"
                className="success-button"
                onClick={() => onOpenDecision(application, STATUSES.APPROVED)}
              >
                Approve
              </button>
              <button
                type="button"
                className="warning-button"
                onClick={() => onOpenDecision(application, STATUSES.NEED_MORE_INFORMATION)}
              >
                Need more info
              </button>
              <button
                type="button"
                className="danger-button"
                onClick={() => onOpenDecision(application, STATUSES.REJECTED)}
              >
                Reject
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function ApplicationList({ applications, selectedId, onSelect, loading }) {
  if (loading) return <Skeleton rows={5} />;

  if (applications.length === 0) {
    return (
      <div className="empty-list">
        <div className="empty-icon">🗂️</div>
        <h3>No applications match</h3>
        <p className="muted">Adjust your filters or create a new draft to get started.</p>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Tracking #</th>
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
              className={selectedId === application.id ? "is-selected" : ""}
              onClick={() => onSelect(application)}
            >
              <td className="mono">{application.tracking_number}</td>
              <td>
                <div className="cell-stack">
                  <strong>{application.applicant_name}</strong>
                  <span className="muted small">{application.applicant_email}</span>
                </div>
              </td>
              <td>{application.company_name}</td>
              <td>{application.application_type}</td>
              <td>
                <StatusPill status={application.status} />
              </td>
              <td>
                <div className="cell-stack">
                  <span>{formatDate(application.created_at, false)}</span>
                  <span className="muted small">{relativeTime(application.created_at)}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [busyAction, setBusyAction] = useState("");
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  const pushToast = useCallback((toast) => {
    const id = ++toastIdRef.current;
    setToasts((current) => [...current, { id, tone: "info", ...toast }]);
    setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const refresh = useCallback(
    async (preferSelectedId) => {
      setLoading(true);
      try {
        const data = await listApplications();
        setApplications(data);
        setSelectedId((current) => {
          const targetId = preferSelectedId ?? current;
          if (targetId && data.some((item) => item.id === targetId)) return targetId;
          return data[0]?.id ?? null;
        });
      } catch (apiError) {
        pushToast({ tone: "error", title: "Failed to load", message: apiError.message });
      } finally {
        setLoading(false);
      }
    },
    [pushToast],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const upsertApplication = useCallback((application) => {
    setApplications((current) => {
      const exists = current.some((item) => item.id === application.id);
      if (!exists) return [application, ...current];
      return current.map((item) => (item.id === application.id ? application : item));
    });
    setSelectedId(application.id);
  }, []);

  const filteredApplications = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return applications.filter((application) => {
      if (filter !== "all" && application.status !== filter) return false;
      if (!needle) return true;
      return (
        application.tracking_number.toLowerCase().includes(needle) ||
        application.applicant_name.toLowerCase().includes(needle) ||
        application.company_name.toLowerCase().includes(needle) ||
        application.applicant_email.toLowerCase().includes(needle)
      );
    });
  }, [applications, filter, search]);

  const selectedApplication =
    applications.find((application) => application.id === selectedId) || null;

  const summary = useMemo(() => {
    const counts = applications.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});
    return {
      total: applications.length,
      drafts: counts[STATUSES.DRAFT] || 0,
      submitted: counts[STATUSES.SUBMITTED] || 0,
      review: counts[STATUSES.UNDER_REVIEW] || 0,
      needsInfo: counts[STATUSES.NEED_MORE_INFORMATION] || 0,
      approved: counts[STATUSES.APPROVED] || 0,
      rejected: counts[STATUSES.REJECTED] || 0,
    };
  }, [applications]);

  async function runAction(name, application, action, successMessage) {
    setBusyAction(name);
    try {
      const updated = await action(application.id);
      upsertApplication(updated);
      pushToast({
        tone: "success",
        title: successMessage,
        message: updated.tracking_number,
      });
    } catch (apiError) {
      pushToast({ tone: "error", title: "Action failed", message: apiError.message });
    } finally {
      setBusyAction("");
    }
  }

  function openCreate() {
    setModal({ kind: "create" });
  }

  function openEdit(application) {
    setModal({ kind: "edit", application });
  }

  function openDecision(application) {
    setModal({ kind: "decision", application });
  }

  function closeModal() {
    setModal(null);
  }

  function handleFormSaved(saved, mode) {
    upsertApplication(saved);
    closeModal();
    pushToast({
      tone: "success",
      title: mode === "edit" ? "Changes saved" : "Draft created",
      message: saved.tracking_number,
    });
  }

  function handleDecisionSaved(saved) {
    upsertApplication(saved);
    closeModal();
    pushToast({
      tone: "success",
      title: `Decision recorded: ${saved.status}`,
      message: saved.tracking_number,
    });
  }

  async function selectAndRefresh(application) {
    setSelectedId(application.id);
    try {
      const fresh = await getApplication(application.id);
      upsertApplication(fresh);
    } catch (apiError) {
      pushToast({ tone: "error", title: "Refresh failed", message: apiError.message });
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <img
            className="brand-logo"
            src="/logo.png"
            alt="Application Workflow Tracker logo"
          />
          <div>
            <p className="eyebrow">Workflow tracker</p>
            <h1>Application Workflow</h1>
          </div>
        </div>
        <div className="topbar-actions">
          <button type="button" className="ghost-button" onClick={() => refresh()}>
            Refresh
          </button>
          <button type="button" className="primary-button" onClick={openCreate}>
            + New application
          </button>
        </div>
      </header>

      <section className="metric-row" aria-label="Summary">
        <article>
          <span className="metric-value">{summary.total}</span>
          <p>Total</p>
        </article>
        <article className="status-draft">
          <span className="metric-value">{summary.drafts}</span>
          <p>Drafts</p>
        </article>
        <article className="status-submitted">
          <span className="metric-value">{summary.submitted}</span>
          <p>Submitted</p>
        </article>
        <article className="status-under-review">
          <span className="metric-value">{summary.review}</span>
          <p>Under review</p>
        </article>
        <article className="status-need-more-information">
          <span className="metric-value">{summary.needsInfo}</span>
          <p>Need info</p>
        </article>
        <article className="status-approved">
          <span className="metric-value">{summary.approved}</span>
          <p>Approved</p>
        </article>
        <article className="status-rejected">
          <span className="metric-value">{summary.rejected}</span>
          <p>Rejected</p>
        </article>
      </section>

      <main className="workspace">
        <section className="panel list-panel">
          <div className="list-toolbar">
            <input
              type="search"
              className="search-input"
              placeholder="Search tracking #, applicant, or company"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search applications"
            />
            <div className="filter-chips" role="tablist" aria-label="Filter by status">
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="tab"
                  aria-selected={filter === option.id}
                  className={`chip ${filter === option.id ? "is-active" : ""}`}
                  onClick={() => setFilter(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <ApplicationList
            applications={filteredApplications}
            selectedId={selectedId}
            onSelect={selectAndRefresh}
            loading={loading}
          />
        </section>

        <ApplicationDetail
          application={selectedApplication}
          busyAction={busyAction}
          onEdit={openEdit}
          onSubmit={(application) =>
            runAction("submit", application, submitApplication, "Application submitted")
          }
          onStartReview={(application) =>
            runAction("review", application, startReview, "Review started")
          }
          onOpenDecision={(application) => openDecision(application)}
        />
      </main>

      {modal?.kind === "create" && (
        <Modal title="Create application" subtitle="New draft" onClose={closeModal}>
          <ApplicationForm
            mode="create"
            onClose={closeModal}
            onSaved={handleFormSaved}
            onError={(message) =>
              pushToast({ tone: "error", title: "Could not save", message })
            }
          />
        </Modal>
      )}

      {modal?.kind === "edit" && (
        <Modal
          title="Edit application"
          subtitle={modal.application.tracking_number}
          onClose={closeModal}
        >
          <ApplicationForm
            mode="edit"
            initial={modal.application}
            onClose={closeModal}
            onSaved={handleFormSaved}
            onError={(message) =>
              pushToast({ tone: "error", title: "Could not save", message })
            }
          />
        </Modal>
      )}

      {modal?.kind === "decision" && (
        <Modal
          title="Reviewer decision"
          subtitle={modal.application.tracking_number}
          onClose={closeModal}
        >
          <DecisionForm
            application={modal.application}
            onClose={closeModal}
            onSaved={handleDecisionSaved}
            onError={(message) =>
              pushToast({ tone: "error", title: "Decision failed", message })
            }
          />
        </Modal>
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
