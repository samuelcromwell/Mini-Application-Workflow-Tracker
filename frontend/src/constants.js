export const APPLICATION_TYPES = [
  "Recordation",
  "Renewal",
  "Change of Ownership",
  "Change of Name",
  "Discontinuation",
];

export const STATUSES = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  NEED_MORE_INFORMATION: "Need More Information",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const DECISION_OPTIONS = [
  STATUSES.APPROVED,
  STATUSES.NEED_MORE_INFORMATION,
  STATUSES.REJECTED,
];
