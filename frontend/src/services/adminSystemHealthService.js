import { fetchWithToken } from './authService.js';

/**
 * Danh sách lịch sử chạy job (Admin).
 * @param {{ page?: number, pageSize?: number, jobName?: string, status?: string, fromDate?: string, toDate?: string }} [params]
 */
export async function searchJobRuns({ page = 1, pageSize = 20, jobName, status, fromDate, toDate } = {}) {
  const query = new URLSearchParams();
  query.set('page', page);
  query.set('pageSize', pageSize);
  if (jobName) query.set('jobName', jobName);
  if (status) query.set('status', status);
  if (fromDate) query.set('fromDate', fromDate);
  if (toDate) query.set('toDate', toDate);
  return fetchWithToken('GET', `/admin/system-health/job-runs?${query.toString()}`);
}

export async function getJobRunsSummary() {
  return fetchWithToken('GET', '/admin/system-health/job-runs/summary');
}

export async function retryJob(jobName) {
  return fetchWithToken('POST', `/admin/system-health/job-runs/${jobName}/retry`);
}

/**
 * Danh sách nhật ký webhook (Admin).
 * @param {{ page?: number, pageSize?: number, source?: string, status?: string, fromDate?: string, toDate?: string }} [params]
 */
export async function searchWebhookLogs({ page = 1, pageSize = 20, source, status, fromDate, toDate } = {}) {
  const query = new URLSearchParams();
  query.set('page', page);
  query.set('pageSize', pageSize);
  if (source) query.set('source', source);
  if (status) query.set('status', status);
  if (fromDate) query.set('fromDate', fromDate);
  if (toDate) query.set('toDate', toDate);
  return fetchWithToken('GET', `/admin/system-health/webhook-logs?${query.toString()}`);
}

export async function retryWebhookLog(id) {
  return fetchWithToken('POST', `/admin/system-health/webhook-logs/${id}/retry`);
}
