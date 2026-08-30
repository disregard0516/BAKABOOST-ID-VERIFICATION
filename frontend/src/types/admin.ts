import type {
  VerificationStatus,
} from "@/types/verification";

export interface AdminQueueItem {
  request_id: string;

  assigned_discord_user_id: string;
  discord_username_snapshot: string | null;

  status: VerificationStatus;

  queue_entered_at: string | null;
  review_started_at: string | null;

  created_at: string;
  expires_at: string;

  created_by_admin_id: string | null;
  created_by_admin_name: string | null;

  assigned_reviewer_id: string | null;
  assigned_reviewer_name: string | null;

  last_activity_at: string;
}

export interface AdminQueueResponse {
  items: AdminQueueItem[];
  total: number;
}