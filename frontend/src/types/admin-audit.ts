export interface AdminAuditEvent {
  id: string;

  actor_type: string;
  actor_id: string | null;

  action: string;
  outcome: string;

  verification_request_id: string | null;
  request_id: string | null;

  timestamp: string;
  metadata: Record<string, unknown>;
}


export interface AdminAuditActivityResponse {
  items: AdminAuditEvent[];

  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}


export interface AdminAuditActivityQuery {
  page?: number;
  page_size?: number;

  action?: string;
  outcome?: string;
  actor_type?: string;
  actor_id?: string;

  verification_request_id?: string;
  request_id?: string;
}
