import React, { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "./AuthContext";
import apiClient from "./api/client";

function formatBytes(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "N/A";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 100 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatHours(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "N/A";
  if (value < 1) return `${Math.round(value * 60)} min`;
  return `${value.toFixed(value >= 10 ? 0 : 1)} h`;
}

function formatDateTime(value) {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return parsed.toLocaleString();
}

function formatRelativeTime(value) {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";

  const diffMs = Date.now() - parsed.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} h ago`;

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} d ago`;
}

function formatSeconds(seconds) {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return "N/A";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function severityClasses(severity) {
  switch (severity) {
    case "critical":
      return "bg-red-50 border-red-200 text-red-800";
    case "warning":
      return "bg-amber-50 border-amber-200 text-amber-800";
    case "ok":
      return "bg-emerald-50 border-emerald-200 text-emerald-800";
    default:
      return "bg-slate-50 border-slate-200 text-slate-800";
  }
}

function statusPillClasses(status) {
  const normalized = (status || "").toLowerCase();
  if (["connected", "operational", "ok", "idle", "polling"].includes(normalized)) {
    return "bg-emerald-100 text-emerald-700";
  }
  if (["warning", "degraded", "starting", "disabled", "unknown"].includes(normalized)) {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-red-100 text-red-700";
}

function MetricCard({ label, value, note, accent = "text-slate-900" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className={`mt-3 text-3xl font-bold ${accent}`}>{value}</div>
      {note ? <div className="mt-2 text-sm text-slate-500">{note}</div> : null}
    </div>
  );
}

function ServiceCard({ title, status, detail, secondary }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-800">{title}</div>
          {detail ? <div className="mt-1 text-sm text-slate-500">{detail}</div> : null}
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusPillClasses(status)}`}>
          {status || "Unknown"}
        </span>
      </div>
      {secondary ? <div className="mt-4 text-sm text-slate-600">{secondary}</div> : null}
    </div>
  );
}

export default function SystemDashboard() {
  const auth = useAuth();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestLatencyMs, setRequestLatencyMs] = useState(null);

  const loadOverview = useCallback(async () => {
    const started = performance.now();
    try {
      const response = await apiClient.get("/operations/overview");
      setOverview(response.data);
      setRequestLatencyMs(Math.round(performance.now() - started));
      setError("");
    } catch (err) {
      setError(err.response?.data?.detail?.message || err.message || "Failed to load operations overview");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
    const interval = setInterval(loadOverview, 30000);
    return () => clearInterval(interval);
  }, [loadOverview]);

  const topSeverity = useMemo(() => {
    const severities = (overview?.alerts || []).map((alert) => alert.severity);
    if (severities.includes("critical")) return "critical";
    if (severities.includes("warning")) return "warning";
    return "ok";
  }, [overview]);

  if (!auth.hasRole(["admin"])) {
    return (
      <div className="mx-auto max-w-3xl rounded-3xl border border-red-200 bg-red-50 p-8 text-red-800 shadow-sm">
        <h1 className="text-2xl font-bold">Access denied</h1>
        <p className="mt-3 text-sm text-red-700">
          The operations dashboard is restricted to admin users because it exposes live platform health and capacity data.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="h-28 animate-pulse rounded-3xl bg-slate-200" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  const traffic = overview?.traffic || {};
  const serviceHealth = overview?.serviceHealth || {};
  const queue = overview?.queue || {};
  const storage = overview?.storage || {};
  const pipeline = overview?.pipeline || {};
  const capacity = overview?.capacity || {};
  const runbook = overview?.runbook || {};

  const currentApplicationsPerSecond = traffic.submissionsLastHour ? traffic.submissionsLastHour / 3600 : 0;
  const recommendedMax = capacity.recommendedSustainedApplicationsPerSecond?.max || 0;
  const loadPercent = recommendedMax > 0
    ? Math.min(999, Math.round((currentApplicationsPerSecond / recommendedMax) * 100))
    : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className={`rounded-3xl border p-6 shadow-sm ${severityClasses(topSeverity)}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em]">Operations Command</div>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Live platform confidence board</h1>
            <p className="mt-3 max-w-3xl text-sm text-slate-600">
              This page is the single place for launch confidence: service health, queue backlog, storage pressure,
              candidate funnel timing, and the last verified capacity baseline.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-sm text-slate-600">
            <div>Last refresh: <span className="font-semibold text-slate-900">{formatDateTime(overview?.generatedAt)}</span></div>
            <div>Browser to API latency: <span className="font-semibold text-slate-900">{requestLatencyMs ?? "N/A"} ms</span></div>
            <div>Server uptime: <span className="font-semibold text-slate-900">{formatSeconds(serviceHealth.api?.uptimeSeconds)}</span></div>
            <button
              type="button"
              onClick={loadOverview}
              className="mt-2 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Refresh now
            </button>
          </div>
        </div>
        {error ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-100/80 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          label="Total Applications"
          value={traffic.totalApplications ?? 0}
          note={`${traffic.stalePipelineItems24h ?? 0} stale for more than 24h`}
        />
        <MetricCard
          label="Submissions 24h"
          value={traffic.submissionsLast24Hours ?? 0}
          note={`${traffic.submissionsLastHour ?? 0} in the last hour`}
        />
        <MetricCard
          label="Unique Candidates 24h"
          value={traffic.uniqueCandidates24h ?? 0}
          note="Distinct applicant emails in the last 24h"
        />
        <MetricCard
          label="Active Staff 24h"
          value={traffic.activeStaff24h ?? 0}
          note={`${traffic.totalStaffUsers ?? 0} total staff accounts`}
        />
        <MetricCard
          label="Queue Visible"
          value={queue.visibleMessages ?? "N/A"}
          note={`${queue.inFlightMessages ?? 0} in flight`}
          accent={queue.visibleMessages > 100 ? "text-amber-600" : "text-slate-900"}
        />
        <MetricCard
          label="Current Load"
          value={`${loadPercent}%`}
          note={`${currentApplicationsPerSecond.toFixed(2)} submit TPS vs safe sustained band`}
          accent={loadPercent >= 80 ? "text-amber-600" : "text-slate-900"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <ServiceCard
          title="API"
          status={serviceHealth.api?.status}
          detail={`Started ${formatRelativeTime(serviceHealth.api?.startedAt)}`}
          secondary={`${serviceHealth.api?.collections ?? 0} Mongo collections visible`}
        />
        <ServiceCard
          title="Database"
          status={serviceHealth.database?.status}
          detail="Primary source of truth"
          secondary="If this turns red, stop launch operations until it is stable."
        />
        <ServiceCard
          title="Event Bus"
          status={serviceHealth.eventBus?.status}
          detail={`Provider: ${serviceHealth.eventBus?.provider || "none"}`}
          secondary={`Visible ${queue.visibleMessages ?? "N/A"} | In flight ${queue.inFlightMessages ?? "N/A"}`}
        />
        <ServiceCard
          title="Worker"
          status={serviceHealth.worker?.status}
          detail={`Last heartbeat ${formatRelativeTime(serviceHealth.worker?.lastHeartbeatAt)}`}
          secondary={`${serviceHealth.worker?.processedJobs ?? 0} jobs processed | ${serviceHealth.worker?.errorCount ?? 0} errors`}
        />
        <ServiceCard
          title="Redis"
          status={serviceHealth.redis?.status}
          detail="Optional component"
          secondary={serviceHealth.redis?.status === "Disabled" ? "Not currently in active use." : `${serviceHealth.redis?.keys ?? 0} keys`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Capacity and confidence</h2>
              <p className="mt-2 text-sm text-slate-500">
                This is the last verified baseline from production testing. Treat it as a guardrail, not a promise.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-900 px-4 py-3 text-right text-white">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-300">Verified burst</div>
              <div className="text-2xl font-bold">{capacity.observedBurstApplicationsPerSecond ?? "N/A"} TPS</div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <MetricCard
              label="Observed Burst"
              value={`${capacity.observedBurstApplicationsPerSecond ?? "N/A"} TPS`}
              note={`${capacity.observedBurstConcurrency ?? "N/A"} concurrent submitters`}
              accent="text-emerald-700"
            />
            <MetricCard
              label="Safe Sustained"
              value={
                capacity.recommendedSustainedApplicationsPerSecond
                  ? `${capacity.recommendedSustainedApplicationsPerSecond.min}-${capacity.recommendedSustainedApplicationsPerSecond.max} TPS`
                  : "N/A"
              }
              note="Use this for launch planning on the current single node"
              accent="text-blue-700"
            />
            <MetricCard
              label="Read Throughput"
              value={`${capacity.observedReadRequestsPerSecond ?? "N/A"} RPS`}
              note={`Last verified ${formatDateTime(capacity.verifiedAt)}`}
              accent="text-violet-700"
            />
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <div className="font-semibold text-slate-900">CTO line to the team</div>
            <p className="mt-2">
              The platform has a measured burst baseline and live monitoring, but it is still a single-node deployment.
              Confidence comes from watching this dashboard, keeping the worker healthy, and reacting to alerts before
              the queue or storage becomes the bottleneck.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Candidate journey timing</h2>
          <p className="mt-2 text-sm text-slate-500">
            These averages help the team answer, “Are applicants being handled quickly enough?”
          </p>

          <div className="mt-6 space-y-4">
            <MetricCard
              label="Submit to Test Invite"
              value={formatHours(pipeline.timings?.averageHoursToTestInvite)}
              note={`${pipeline.timings?.averageHoursToTestInviteSampleSize ?? 0} samples`}
              accent="text-slate-900"
            />
            <MetricCard
              label="Candidate Test Completion"
              value={formatHours(pipeline.timings?.averageCandidateTestCompletionHours)}
              note={`${pipeline.timings?.averageCandidateTestCompletionSampleSize ?? 0} samples`}
              accent="text-slate-900"
            />
            <MetricCard
              label="Offer Response"
              value={formatHours(pipeline.timings?.averageOfferResponseHours)}
              note={`${pipeline.timings?.averageOfferResponseSampleSize ?? 0} samples`}
              accent="text-slate-900"
            />
            <MetricCard
              label="Latest Update Lag"
              value={formatHours(pipeline.timings?.averageHoursToLatestUpdate)}
              note={`${pipeline.timings?.averageHoursToLatestUpdateSampleSize ?? 0} samples`}
              accent="text-slate-900"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Pipeline pressure</h2>
          <p className="mt-2 text-sm text-slate-500">
            Current status distribution. Watch for stages growing faster than the team or worker can drain them.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {Object.entries(pipeline.statusCounts || {}).length === 0 ? (
              <div className="text-sm text-slate-500">No application status data available.</div>
            ) : (
              Object.entries(pipeline.statusCounts || {}).map(([status, count]) => (
                <div key={status} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{status}</div>
                  <div className="mt-2 text-2xl font-bold text-slate-900">{count}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Storage and host</h2>
          <div className="mt-6 space-y-4">
            <MetricCard
              label="S3 CV Storage"
              value={formatBytes(storage.s3?.totalBytes)}
              note={`${storage.s3?.objectCount ?? 0} objects in ${storage.s3?.bucketName || "N/A"}`}
            />
            <MetricCard
              label="Local Uploads"
              value={formatBytes(storage.local?.uploadBytes)}
              note={storage.local?.uploadPath || "N/A"}
            />
            <MetricCard
              label="Server Disk Free"
              value={formatBytes(storage.local?.diskFreeBytes)}
              note={`${storage.local?.diskUsagePercent ?? "N/A"}% used`}
              accent={storage.local?.diskUsagePercent >= 85 ? "text-amber-600" : "text-slate-900"}
            />
            <MetricCard
              label="Worker Heartbeat"
              value={formatRelativeTime(serviceHealth.worker?.lastHeartbeatAt)}
              note={serviceHealth.worker?.hostname ? `Host ${serviceHealth.worker.hostname}` : "No worker heartbeat yet"}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Alerts and actions</h2>
          <div className="mt-6 space-y-4">
            {(overview?.alerts || []).map((alert, index) => (
              <div key={`${alert.title}-${index}`} className={`rounded-2xl border p-4 ${severityClasses(alert.severity)}`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="text-lg font-semibold">{alert.title}</div>
                  <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
                    {alert.severity}
                  </span>
                </div>
                <p className="mt-3 text-sm">{alert.message}</p>
                <p className="mt-3 text-sm font-semibold">Action: <span className="font-normal">{alert.action}</span></p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
          <h2 className="text-xl font-bold">Incident flow</h2>
          <p className="mt-2 text-sm text-slate-300">
            Keep the response visual and role-driven. One owner leads, others fix, and one person communicates.
          </p>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Roles</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(runbook.incidentRoles || []).map((role) => (
                  <span key={role} className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">
                    {role}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">First 15 minutes</div>
              <div className="mt-3 space-y-3">
                {(runbook.firstActions || []).map((action) => (
                  <div key={action} className="flex gap-3 text-sm text-slate-200">
                    <span className="mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-300">
                      •
                    </span>
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300">
              <div className="font-semibold text-white">Recommended monitoring rotation</div>
              <p className="mt-2">
                During launch, assign one person to this dashboard continuously, one to AWS/server logs, one to application
                behavior, and one to stakeholder updates. Swap every 2-3 hours to keep judgment sharp.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
