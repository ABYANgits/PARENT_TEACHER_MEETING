-- rls.sql
-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- Profiles Policies
--------------------------------------------------------------------------------
-- Everyone can read profiles
CREATE POLICY "Profiles are viewable by everyone." ON public.profiles
  FOR SELECT USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile." ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile." ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

--------------------------------------------------------------------------------
-- Teachers Policies
--------------------------------------------------------------------------------
-- Everyone can read teachers
CREATE POLICY "Teachers are viewable by everyone." ON public.teachers
  FOR SELECT USING (true);

-- Teachers can update their own record
CREATE POLICY "Teachers can update their own record." ON public.teachers
  FOR UPDATE USING (auth.uid() = id);

-- Teachers can insert their own record
CREATE POLICY "Teachers can insert their own record." ON public.teachers
  FOR INSERT WITH CHECK (auth.uid() = id);

--------------------------------------------------------------------------------
-- Children Policies
--------------------------------------------------------------------------------
-- Parents can view their own children
CREATE POLICY "Parents can view their own children." ON public.children
  FOR SELECT USING (auth.uid() = parent_id);

-- Teachers can view children they have meetings with
CREATE POLICY "Teachers can view children they have meetings with." ON public.children
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.meetings
      WHERE meetings.child_id = children.id
      AND meetings.teacher_id = auth.uid()
    )
  );

-- Parents can insert children
CREATE POLICY "Parents can insert their own children." ON public.children
  FOR INSERT WITH CHECK (auth.uid() = parent_id);

-- Parents can update their own children
CREATE POLICY "Parents can update their own children." ON public.children
  FOR UPDATE USING (auth.uid() = parent_id);

-- Parents can delete their own children
CREATE POLICY "Parents can delete their own children." ON public.children
  FOR DELETE USING (auth.uid() = parent_id);

--------------------------------------------------------------------------------
-- Meetings Policies
--------------------------------------------------------------------------------
-- Parents can view meetings for their children
CREATE POLICY "Parents can view their children's meetings." ON public.meetings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.children
      WHERE children.id = meetings.child_id
      AND children.parent_id = auth.uid()
    )
  );

-- Teachers can view meetings assigned to them
CREATE POLICY "Teachers can view their meetings." ON public.meetings
  FOR SELECT USING (auth.uid() = teacher_id);

-- Parents can insert meetings for their children
CREATE POLICY "Parents can insert meetings for their children." ON public.meetings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.children
      WHERE children.id = meetings.child_id
      AND children.parent_id = auth.uid()
    )
  );

-- Teachers can update teacher_notes on their meetings
CREATE POLICY "Teachers can update teacher_notes on their meetings." ON public.meetings
  FOR UPDATE USING (auth.uid() = teacher_id);
