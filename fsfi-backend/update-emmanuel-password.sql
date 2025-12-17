-- Update Emmanuel Kwofie's password
-- Generated hash for password: f:8.2sc#udM}d|Sk

UPDATE users
SET password_hash = '$argon2id$v=19$m=19456,t=2,p=1$LMlwyuZmiK6ZhAK4TP2jMg$wB3KvPGWcOYMuncLsnqnNYjggXGt9ssTOm9VuTgcIp4',
    failed_login_attempts = 0,
    locked_until = NULL,
    updated_at = NOW()
WHERE email = 'emmanuel@fsfi.org';

-- Verify the update
SELECT
    email,
    LEFT(password_hash, 50) as hash_preview,
    LENGTH(password_hash) as hash_length,
    failed_login_attempts,
    locked_until,
    'Password updated successfully!' as status
FROM users
WHERE email = 'emmanuel@fsfi.org';
