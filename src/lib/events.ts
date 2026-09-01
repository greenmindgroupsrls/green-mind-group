export type EventRow = {
  id: number;
  city: string;
  venue: string | null;
  address: string | null;
  event_date: string;
  registration_time: string | null;
  start_time: string | null;
  notes: string | null;
  director_name: string | null;
  photo_url: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
};

export type InviteType = "live" | "zoom";
export type GuestStatus = "invitato" | "confermato";

export type EventGuest = {
  id: number;
  event_id: number | null;
  inviter_code: number;
  invite_type: InviteType;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  gdpr_consent: boolean;
  consented_at: string | null;
  status: GuestStatus;
  created_at: string;
};

export const INVITE_TYPE_LABEL: Record<InviteType, string> = {
  live: "Live",
  zoom: "Zoom",
};

export const INVITE_TYPE_BADGE_CLASS: Record<InviteType, string> = {
  live: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
  zoom: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
};

export const GUEST_STATUS_LABEL: Record<GuestStatus, string> = {
  invitato: "Invitato",
  confermato: "Confermato",
};

export const GUEST_STATUS_BADGE_CLASS: Record<GuestStatus, string> = {
  invitato: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300",
  confermato: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
};
