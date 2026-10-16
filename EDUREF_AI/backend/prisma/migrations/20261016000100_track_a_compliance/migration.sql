-- Additive upgrade; preserve existing student/request data and the applied initial migration.
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "birthDate" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "studentClass" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "major" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "idCard" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "idCardDate" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "idCardPlace" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "permanentAddress" TEXT;
ALTER TABLE "StudentRequest" ADD COLUMN IF NOT EXISTS "verificationRunId" TEXT;
ALTER TABLE "StudentRequest" ADD COLUMN IF NOT EXISTS "verificationCaseId" TEXT;
CREATE INDEX IF NOT EXISTS "StudentRequest_studentId_requestTypeId_verificationRunId_st_idx"
ON "StudentRequest"("studentId", "requestTypeId", "verificationRunId", "status");
