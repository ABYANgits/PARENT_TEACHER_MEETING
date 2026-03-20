-- Run this ENTIRE block in your Supabase SQL Editor.
-- This will wipe the existing tables and recreate them cleanly so no errors stop the execution.

-- 1. Drop existing objects to avoid "already exists" errors stopping the script
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.meetings CASCADE;
DROP TABLE IF EXISTS public.children CASCADE;
DROP TABLE IF EXISTS public.teachers CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- 2. Create custom types
CREATE TYPE user_role AS ENUM ('parent', 'teacher');

-- 3. Create tables
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.teachers (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  experience TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  section TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  meeting_time TIMESTAMP WITH TIME ZONE NOT NULL,
  topic TEXT NOT NULL,
  teacher_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create trigger to automatically insert profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'New User'),
    COALESCE(new.raw_user_meta_data->>'role', 'parent')::public.user_role
  );
  
  IF new.raw_user_meta_data->>'role' = 'teacher' THEN
    INSERT INTO public.teachers (id, subject, experience)
    VALUES (new.id, COALESCE(new.raw_user_meta_data->>'subject', 'General'), new.raw_user_meta_data->>'experience');
  END IF;

  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- 6. Helper Functions to break infinite recursion in RLS
CREATE OR REPLACE FUNCTION public.is_parent_of_child(c_id UUID)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM children WHERE id = c_id AND parent_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_teacher_of_child(c_id UUID)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM meetings WHERE child_id = c_id AND teacher_id = auth.uid()
  );
$$;

-- 7. Apply Policies
CREATE POLICY "Profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Teachers are viewable by everyone." ON public.teachers FOR SELECT USING (true);
CREATE POLICY "Teachers can update their own record." ON public.teachers FOR UPDATE USING (auth.uid() = id);

-- Children Policies
CREATE POLICY "Parents can view their own children." ON public.children FOR SELECT USING (auth.uid() = parent_id);
CREATE POLICY "Teachers can view children they have meetings with." ON public.children FOR SELECT USING (public.is_teacher_of_child(id));
CREATE POLICY "Parents can insert their own children." ON public.children FOR INSERT WITH CHECK (auth.uid() = parent_id);
CREATE POLICY "Parents can update their own children." ON public.children FOR UPDATE USING (auth.uid() = parent_id);
CREATE POLICY "Parents can delete their own children." ON public.children FOR DELETE USING (auth.uid() = parent_id);

-- Meetings Policies
CREATE POLICY "Parents can view their children's meetings." ON public.meetings FOR SELECT USING (public.is_parent_of_child(child_id));
CREATE POLICY "Teachers can view their meetings." ON public.meetings FOR SELECT USING (auth.uid() = teacher_id);
CREATE POLICY "Parents can insert meetings for their children." ON public.meetings FOR INSERT WITH CHECK (public.is_parent_of_child(child_id));
CREATE POLICY "Teachers can update teacher_notes on their meetings." ON public.meetings FOR UPDATE USING (auth.uid() = teacher_id);
