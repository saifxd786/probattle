-- Update admin profile email from proscims.app to probattle.app
UPDATE public.profiles 
SET email = REPLACE(email, '@proscims.app', '@probattle.app'),
    updated_at = now()
WHERE email LIKE '%@proscims.app';

-- Update all other profiles that might have proscims.app
UPDATE public.profiles 
SET email = phone || '@probattle.app',
    updated_at = now()
WHERE email LIKE '%@proscims.app' AND phone IS NOT NULL;