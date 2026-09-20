export const applicationMatches = (item, tab) => tab === "all" || (tab === "pending"
  ? ["submitted", "resubmitted", "correction_required", "data_approved"].includes(item.workflow_status)
  : item.workflow_status === tab);
