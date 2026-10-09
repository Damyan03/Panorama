import { buildQueryString } from '../utils/url';
import { requestJson } from './client';

export interface CreateReportRequest {
	resourceType: string;
	resourceId: number;
	reason: string;
	details?: string | null;
	reporterEmail?: string | null;
	metadata?: unknown | null;
	captchaToken?: string | null;
}

export interface ReportResponse {
	id: number;
	resourceType: string;
	resourceId: number;
	reporterUserId: number | null;
	reporterIp: string | null;
	reason: string;
	details: string | null;
	status: string;
	createdAt: string;
}

export function postReport(body: CreateReportRequest): Promise<ReportResponse> {
	return requestJson<ReportResponse>('/reports', {
		method: 'POST',
		body: JSON.stringify(body),
		headers: { 'Content-Type': 'application/json' },
	});
}

export function getReports(
	resourceType?: string,
	status?: string,
): Promise<{ items: ReportResponse[] }> {
	return requestJson<{ items: ReportResponse[] }>(
		`/reports${buildQueryString({ resourceType, status })}`,
	);
}
