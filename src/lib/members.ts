import type { MemberRole } from "./current-member";

export type Member = {
  activity_code: number;
  username: string;
  ref_sponsor_code: number | null;
  parent_code: number | null;
  pass_up_done: boolean;
  created_at: string;
  auth_user_id: string | null;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: MemberRole;
  suspended: boolean;
  suspended_reason: string | null;
};
