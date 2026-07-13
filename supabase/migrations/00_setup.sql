-- Enable RLS on all tables
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "checklist_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "checklist_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "checklist_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "checklist_submissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "submission_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "photos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "status_history" ENABLE ROW LEVEL SECURITY;

-- 1. Profiles: Employees can see their own profile. Admins can see/update all.
CREATE POLICY "Users can view their own profile" ON "profiles"
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can do everything on profiles" ON "profiles"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

-- 2. Checklist Templates: Everyone can see active templates. Only admins can modify.
CREATE POLICY "Everyone can view active templates" ON "checklist_templates"
  FOR SELECT USING ("isActive" = true OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN'));

CREATE POLICY "Admins can do everything on templates" ON "checklist_templates"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

-- 3. Checklist Items: Everyone can see items for templates they can see. Admins can modify.
CREATE POLICY "Everyone can view items" ON "checklist_items"
  FOR SELECT USING (true);

CREATE POLICY "Admins can do everything on items" ON "checklist_items"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

-- 4. Checklist Assignments: Employees see their own. Admins see/modify all.
CREATE POLICY "Employees see their own assignments" ON "checklist_assignments"
  FOR SELECT USING ("assignedToId" = auth.uid() OR "assignedById" = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN'));

CREATE POLICY "Admins can do everything on assignments" ON "checklist_assignments"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

-- 5. Submissions: Employees see their own. Admins see/modify all.
CREATE POLICY "Employees see their own submissions" ON "checklist_submissions"
  FOR SELECT USING ("submittedById" = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN'));

CREATE POLICY "Employees can create their own submissions" ON "checklist_submissions"
  FOR INSERT WITH CHECK ("submittedById" = auth.uid());

CREATE POLICY "Employees can update their own draft submissions" ON "checklist_submissions"
  FOR UPDATE USING ("submittedById" = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN'));

CREATE POLICY "Admins can do everything on submissions" ON "checklist_submissions"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

-- 6. Submission Items: Same logic as submissions
CREATE POLICY "Employees see own submission items" ON "submission_items"
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM checklist_submissions cs WHERE cs.id = "submissionId" AND cs."submittedById" = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

CREATE POLICY "Employees can create/update own submission items" ON "submission_items"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM checklist_submissions cs WHERE cs.id = "submissionId" AND cs."submittedById" = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

-- 7. Photos: Same logic
CREATE POLICY "Employees see own photos" ON "photos"
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM checklist_submissions cs WHERE cs.id = "submissionId" AND cs."submittedById" = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

CREATE POLICY "Employees can manage own photos" ON "photos"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM checklist_submissions cs WHERE cs.id = "submissionId" AND cs."submittedById" = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

-- 8. Comments: Same logic
CREATE POLICY "Everyone involved sees comments" ON "comments"
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM checklist_submissions cs WHERE cs.id = "submissionId" AND cs."submittedById" = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

CREATE POLICY "Employees can add comments" ON "comments"
  FOR INSERT WITH CHECK ("authorId" = auth.uid());

CREATE POLICY "Admins can do everything on comments" ON "comments"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

-- 9. Status History: Same logic
CREATE POLICY "Everyone involved sees history" ON "status_history"
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM checklist_submissions cs WHERE cs.id = "submissionId" AND cs."submittedById" = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

CREATE POLICY "Employees can add history" ON "status_history"
  FOR INSERT WITH CHECK ("changedById" = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN'));


-- TRIGGERS
-- Create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, "fullName", email, role, "isActive", "createdAt", "updatedAt")
  VALUES (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'User'), new.email, 'EMPLOYEE', true, now(), now());
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public) VALUES ('checklist-photos', 'checklist-photos', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Authenticated users can upload photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'checklist-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Everyone can read photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'checklist-photos');
