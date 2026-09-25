-- The extension used to be dev.s4way.nebula. Carry its saved theme and announcement buttons over to the
-- new ID. The old rows stay, so an install that still has the old extension keeps working until it is removed.
INSERT INTO settings (key, value)
SELECT 'dev.caloptreyx.mint::' || substring(key FROM length('dev.s4way.nebula::') + 1), value
FROM settings
WHERE key IN ('dev.s4way.nebula::theme', 'dev.s4way.nebula::announcement_ctas')
ON CONFLICT (key) DO NOTHING;
