CREATE TABLE "PetitionDraft" (
    "id" TEXT NOT NULL,
    "studentCode" TEXT NOT NULL,
    "formCode" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'COLLECTING',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "inputData" JSONB NOT NULL,
    "fieldSources" JSONB NOT NULL,
    "submittedRequestId" TEXT,
    "confirmation" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PetitionDraft_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PetitionDraft_submittedRequestId_key" ON "PetitionDraft"("submittedRequestId");
CREATE INDEX "PetitionDraft_studentCode_state_updatedAt_idx" ON "PetitionDraft"("studentCode", "state", "updatedAt");
