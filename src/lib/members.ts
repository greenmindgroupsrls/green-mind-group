import type { MemberRole } from "./current-member";

export type Member = {
  activity_code: number;
  username: string;
  ref_sponsor_code: number | null;
  parent_code: number | null;
  pass_up_done: boolean;
  // Sistema 2: quante vendite qualificanti sono gia' state cedute al VIP
  // superiore, e quando le qualifiche sono state conquistate. Le qualifiche
  // non si perdono piu' una volta ottenute.
  passed_up_count: number;
  vip_qualified_at: string | null;
  royal_qualified_at: string | null;
  created_at: string;
  auth_user_id: string | null;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: MemberRole;
  suspended: boolean;
  suspended_reason: string | null;
};
