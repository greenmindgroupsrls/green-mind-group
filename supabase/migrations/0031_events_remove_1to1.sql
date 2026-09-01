-- "1 to 1" era di fatto un appuntamento personale, già coperto
-- dall'Agenda (marketing/agenda, kind='appuntamento'): rimosso per non
-- avere due modi di rappresentare la stessa cosa. Restano solo 'live'
-- (evento in sala) e 'zoom' (online).
alter table event_guests drop constraint if exists event_guests_invite_type_check;
alter table event_guests
  add constraint event_guests_invite_type_check check (invite_type in ('live', 'zoom'));
