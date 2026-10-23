/** The scripted sessions the product panels play. Every name, path and count is sample data. */
import { script } from "./sessionScript.ts";
import type { Subagent } from "./sessionScript.ts";

/** The home page: a read-only security review of one repository. */
export const REVIEW_AGENTS: Subagent[] = [
  {
    name: "Map the attack surface",
    task: "Routes, handlers and entry points in src/",
    activity: { working: "Reading src/routes/ · 41 files", returning: "Returning 38 entry points", done: "Returned 38 entry points" },
  },
  {
    name: "Check auth and sessions",
    task: "Token checks on every route",
    activity: { searching: "Searching for routes without requireAuth", solving: "Tracing the refresh-token path", returning: "Returning 2 findings", done: "Returned 2 findings" },
  },
  {
    name: "Trace untrusted input",
    task: "Untrusted data that reaches a loader",
    activity: { searching: "Searching for pickle.loads and yaml.load", solving: "Following upload.py:88 to its caller", returning: "Returning 1 finding", done: "Returned 1 finding · CWE-502" },
  },
  {
    name: "Audit dependencies",
    task: "The lockfile against known CVEs",
    activity: { working: "Matching 412 packages", returning: "Returning 3 advisories", done: "Returned 3 advisories" },
  },
  {
    name: "Verify the findings",
    task: "Confirm each finding against the source",
    activity: { working: "Checking finding 1 of 3", solving: "Rereading upload.py with its callers", returning: "Returning 3 confirmed", done: "Confirmed 3 of 3" },
  },
  {
    name: "Draft the report",
    task: "report.md with evidence for each finding",
    activity: { working: "Writing report.md", returning: "Returning report.md", done: "Wrote report.md" },
  },
];

export const REVIEW = script([
  [1400, "working", "qqqqqq"],
  [2400, "searching", "wsswqq"],
  [2400, "solving", "wxxwqq"],
  [2200, "working", "rxxrqq"],
  [2400, "searching", "dxrdwq"],
  [2200, "solving", "drddxq"],
  [2400, "working", "ddddrw"],
  [2200, "working", "dddddr"],
  [3200, "idle", "dddddd"],
]);

/** The raptor page: overnight alert triage on one host. */
export const TRIAGE_AGENTS: Subagent[] = [
  {
    name: "Group the alerts",
    task: "Cluster last night's alerts by host and rule",
    activity: { working: "Reading 214 alerts from alerts.jsonl", returning: "Returning 6 clusters", done: "Returned 6 clusters" },
  },
  {
    name: "Pull the auth logs",
    task: "Match each cluster to sign-in events",
    activity: { searching: "Searching auth.log for 10.4.2.17", solving: "Joining sessions to alert times", returning: "Returning 3 sessions", done: "Returned 3 sessions" },
  },
  {
    name: "Check the indicators",
    task: "Look up each IP and hash in local threat intel",
    activity: { searching: "Looking up 31 indicators", returning: "Returning 2 known-bad", done: "Returned 2 known-bad" },
  },
  {
    name: "Write the timeline",
    task: "timeline.md with a source for each event",
    activity: { working: "Writing timeline.md", returning: "Returning timeline.md", done: "Wrote timeline.md" },
  },
];

export const TRIAGE = script([
  [1400, "working", "qqqq"],
  [2400, "searching", "wssq"],
  [2400, "solving", "rxsq"],
  [2200, "working", "dxrq"],
  [2400, "working", "drdw"],
  [2200, "working", "dddr"],
  [3200, "idle", "dddd"],
]);
