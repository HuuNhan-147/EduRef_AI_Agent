-- AlterTable
ALTER TABLE "StudentRequest" ADD COLUMN     "evaluationSnapshot" JSONB,
ADD COLUMN     "thresholdAssessment" JSONB;

-- CreateTable
CREATE TABLE "EscalationThresholdPolicy" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "minEvidenceScore" INTEGER NOT NULL,
    "scorerVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "parentPolicyId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "feedbackIds" JSONB NOT NULL,
    "calibrationFingerprints" JSONB NOT NULL,
    "calibrationReport" JSONB NOT NULL,
    "approvedById" TEXT,
    "approvalNote" TEXT,
    "approvalReportId" TEXT,
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EscalationThresholdPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscalationFeedback" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "reviewerName" TEXT NOT NULL,
    "observedDecision" TEXT NOT NULL,
    "expectedDecision" TEXT NOT NULL,
    "expectedClassification" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidenceRef" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "thresholdAssessment" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EscalationFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscalationEvaluationDataset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "sourceRef" TEXT NOT NULL,
    "sourceSha256" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "referenceDate" TEXT NOT NULL,
    "policyAuthorIds" JSONB NOT NULL,
    "independenceDeclaration" TEXT NOT NULL,
    "cases" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "contentHash" TEXT,
    "createdById" TEXT NOT NULL,
    "frozenById" TEXT,
    "freezeNote" TEXT,
    "frozenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EscalationEvaluationDataset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscalationEvaluationReport" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "datasetHash" TEXT NOT NULL,
    "baselinePolicyId" TEXT NOT NULL,
    "candidatePolicyId" TEXT NOT NULL,
    "baselinePolicyHash" TEXT NOT NULL,
    "candidatePolicyHash" TEXT NOT NULL,
    "protocolVersion" TEXT NOT NULL,
    "replayVersion" TEXT NOT NULL,
    "runtimeCodeHash" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "scorerVersion" TEXT NOT NULL,
    "eligible" BOOLEAN NOT NULL,
    "comparison" JSONB NOT NULL,
    "reportHash" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EscalationEvaluationReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EscalationThresholdPolicy_version_key" ON "EscalationThresholdPolicy"("version");

-- CreateIndex
CREATE INDEX "EscalationThresholdPolicy_status_idx" ON "EscalationThresholdPolicy"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EscalationFeedback_requestId_reviewerId_key" ON "EscalationFeedback"("requestId", "reviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "EscalationEvaluationDataset_name_version_key" ON "EscalationEvaluationDataset"("name", "version");

-- CreateIndex
CREATE INDEX "EscalationEvaluationReport_candidatePolicyId_createdAt_idx" ON "EscalationEvaluationReport"("candidatePolicyId", "createdAt");

-- CreateIndex
CREATE INDEX "EscalationEvaluationReport_datasetId_idx" ON "EscalationEvaluationReport"("datasetId");

-- Enforce one globally active threshold and its bounded score at database level.
CREATE UNIQUE INDEX "EscalationThresholdPolicy_one_active" ON "EscalationThresholdPolicy" ("status") WHERE "status" = 'ACTIVE';
ALTER TABLE "EscalationThresholdPolicy" ADD CONSTRAINT "EscalationThresholdPolicy_score_range" CHECK ("minEvidenceScore" BETWEEN 0 AND 100);
ALTER TABLE "EscalationThresholdPolicy" ADD CONSTRAINT "EscalationThresholdPolicy_status_check" CHECK ("status" IN ('DRAFT', 'ACTIVE', 'RETIRED'));
