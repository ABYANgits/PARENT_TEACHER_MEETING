-- schema.sql
-- Create custom types for roles
CREATE TYPE user_role AS ENUM ('parent', 'teacher');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create teachers table
CREATE TABLE public.teachers (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  experience TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create children table
CREATE TABLE public.children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  section TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create meetings table
CREATE TABLE public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  meeting_time TIMESTAMP WITH TIME ZONE NOT NULL,
  topic TEXT NOT NULL,
  teacher_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger to create profile on signup
-- Note: This is a basic function. Depending on how signup sends metadata, you might extract 'role' and 'name' from auth.users raw_user_meta_data.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Only create profile automatically if role is provided (email/password signup).
  -- Google OAuth users won't have a role; they pick it on /choose-role page.
  IF new.raw_user_meta_data->>'role' IS NOT NULL THEN
    INSERT INTO public.profiles (id, name, role)
    VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', 'User'),
      (new.raw_user_meta_data->>'role')::user_role
    );
    
    IF new.raw_user_meta_data->>'role' = 'teacher' THEN
      INSERT INTO public.teachers (id, subject, experience)
      VALUES (new.id, COALESCE(new.raw_user_meta_data->>'subject', 'General'), new.raw_user_meta_data->>'experience');
    END IF;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger definition
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
