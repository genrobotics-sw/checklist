-- Drop the recursive policy on profiles
DROP POLICY IF EXISTS "Admins can do everything on profiles" ON "profiles";

-- Create a security definer function to safely check admin status without triggering RLS loops
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the admin policy using the safe function
CREATE POLICY "Admins can do everything on profiles" ON "profiles"
  FOR ALL USING (public.is_admin());

-- Update other policies to use is_admin() for better performance (optional but good practice)
DROP POLICY IF EXISTS "Everyone can view active templates" ON "checklist_templates";
CREATE POLICY "Everyone can view active templates" ON "checklist_templates"
  FOR SELECT USING ("isActive" = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can do everything on templates" ON "checklist_templates";
CREATE POLICY "Admins can do everything on templates" ON "checklist_templates"
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can do everything on items" ON "checklist_items";
CREATE POLICY "Admins can do everything on items" ON "checklist_items"
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Employees see their own assignments" ON "checklist_assignments";
CREATE POLICY "Employees see their own assignments" ON "checklist_assignments"
  FOR SELECT USING ("assignedToId" = auth.uid() OR "assignedById" = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admins can do everything on assignments" ON "checklist_assignments";
CREATE POLICY "Admins can do everything on assignments" ON "checklist_assignments"
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Employees see their own submissions" ON "checklist_submissions";
CREATE POLICY "Employees see their own submissions" ON "checklist_submissions"
  FOR SELECT USING ("submittedById" = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Employees can update their own draft submissions" ON "checklist_submissions";
CREATE POLICY "Employees can update their own draft submissions" ON "checklist_submissions"
  FOR UPDATE USING ("submittedById" = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admins can do everything on submissions" ON "checklist_submissions";
CREATE POLICY "Admins can do everything on submissions" ON "checklist_submissions"
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Employees see own submission items" ON "submission_items";
CREATE POLICY "Employees see own submission items" ON "submission_items"
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM checklist_submissions cs WHERE cs.id = "submissionId" AND cs."submittedById" = auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Employees can create/update own submission items" ON "submission_items";
CREATE POLICY "Employees can create/update own submission items" ON "submission_items"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM checklist_submissions cs WHERE cs.id = "submissionId" AND cs."submittedById" = auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Employees see own photos" ON "photos";
CREATE POLICY "Employees see own photos" ON "photos"
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM checklist_submissions cs WHERE cs.id = "submissionId" AND cs."submittedById" = auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Employees can manage own photos" ON "photos";
CREATE POLICY "Employees can manage own photos" ON "photos"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM checklist_submissions cs WHERE cs.id = "submissionId" AND cs."submittedById" = auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Everyone involved sees comments" ON "comments";
CREATE POLICY "Everyone involved sees comments" ON "comments"
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM checklist_submissions cs WHERE cs.id = "submissionId" AND cs."submittedById" = auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Admins can do everything on comments" ON "comments";
CREATE POLICY "Admins can do everything on comments" ON "comments"
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Everyone involved sees history" ON "status_history";
CREATE POLICY "Everyone involved sees history" ON "status_history"
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM checklist_submissions cs WHERE cs.id = "submissionId" AND cs."submittedById" = auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Employees can add history" ON "status_history";
CREATE POLICY "Employees can add history" ON "status_history"
  FOR INSERT WITH CHECK ("changedById" = auth.uid() OR public.is_admin());
