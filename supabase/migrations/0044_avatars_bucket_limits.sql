-- Rete di sicurezza lato server per il bucket avatars: il client ora
-- ridimensiona/comprime sempre l'immagine prima di caricarla (output
-- tipicamente poche centinaia di KB), quindi un utente normale non incontra
-- mai questo limite — serve solo contro chi bypassa il browser e chiama
-- direttamente l'API di Storage.
update storage.buckets
set file_size_limit = 5 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'avatars';
