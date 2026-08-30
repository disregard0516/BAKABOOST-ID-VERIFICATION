export interface ReviewerSummary {
  id: string;
  display_name: string;
  email: string | null;
  role: string;
  is_active: boolean;
}

export interface ReviewerListResponse {
  items: ReviewerSummary[];
}