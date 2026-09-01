import type { Member } from "./members";

function m(
  activity_code: number,
  username: string,
  ref_sponsor_code: number | null,
  parent_code: number | null,
  pass_up_done = false,
): Member {
  return {
    activity_code,
    username,
    ref_sponsor_code,
    parent_code,
    pass_up_done,
    created_at: new Date(2026, 0, activity_code + 1).toISOString(),
    auth_user_id: null,
    email: null,
    first_name: null,
    last_name: null,
    role: "incaricato",
    suspended: false,
    suspended_reason: null,
  };
}

// Mostrato solo quando Supabase non è configurato/raggiungibile o non c'è
// ancora una sessione reale: un solo nodo, l'account aziendale.
export const MOCK_MEMBERS: Member[] = [m(0, "green-mind-group", null, null)];
