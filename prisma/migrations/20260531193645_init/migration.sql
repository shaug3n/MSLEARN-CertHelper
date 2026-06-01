-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "sessionTokenHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyGuide" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "examCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyGuide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Objective" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "weightMin" INTEGER,
    "weightMax" INTEGER,

    CONSTRAINT "Objective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourcePage" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "SourcePage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceChunk" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "sourcePageId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "headingPathJson" TEXT NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "SourceChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "objectiveId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "choicesJson" TEXT,
    "answerJson" TEXT,
    "expectedAnswer" TEXT,
    "rubric" TEXT,
    "citationsJson" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttemptAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "objectiveId" TEXT NOT NULL,
    "answerJson" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "feedback" TEXT NOT NULL,

    CONSTRAINT "AttemptAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RemediationPack" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "objectiveId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "lesson" TEXT NOT NULL,
    "workedExample" TEXT NOT NULL,
    "citationsJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RemediationPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flashcard" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "objectiveId" TEXT NOT NULL,
    "front" TEXT NOT NULL,
    "back" TEXT NOT NULL,
    "citationsJson" TEXT NOT NULL,
    "intervalDays" INTEGER NOT NULL DEFAULT 0,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "dueAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Flashcard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlashcardReview" (
    "id" TEXT NOT NULL,
    "flashcardId" TEXT NOT NULL,
    "rating" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previousIntervalDays" INTEGER NOT NULL,
    "nextIntervalDays" INTEGER NOT NULL,

    CONSTRAINT "FlashcardReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_sessionTokenHash_key" ON "User"("sessionTokenHash");

-- CreateIndex
CREATE INDEX "StudyGuide_userId_idx" ON "StudyGuide"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudyGuide_userId_url_key" ON "StudyGuide"("userId", "url");

-- CreateIndex
CREATE INDEX "Objective_guideId_idx" ON "Objective"("guideId");

-- CreateIndex
CREATE INDEX "SourcePage_guideId_idx" ON "SourcePage"("guideId");

-- CreateIndex
CREATE UNIQUE INDEX "SourcePage_guideId_url_key" ON "SourcePage"("guideId", "url");

-- CreateIndex
CREATE INDEX "SourceChunk_guideId_idx" ON "SourceChunk"("guideId");

-- CreateIndex
CREATE INDEX "SourceChunk_sourcePageId_idx" ON "SourceChunk"("sourcePageId");

-- CreateIndex
CREATE INDEX "Question_guideId_idx" ON "Question"("guideId");

-- CreateIndex
CREATE INDEX "Question_objectiveId_idx" ON "Question"("objectiveId");

-- CreateIndex
CREATE INDEX "Attempt_guideId_idx" ON "Attempt"("guideId");

-- CreateIndex
CREATE INDEX "AttemptAnswer_attemptId_idx" ON "AttemptAnswer"("attemptId");

-- CreateIndex
CREATE INDEX "AttemptAnswer_objectiveId_idx" ON "AttemptAnswer"("objectiveId");

-- CreateIndex
CREATE INDEX "RemediationPack_guideId_idx" ON "RemediationPack"("guideId");

-- CreateIndex
CREATE UNIQUE INDEX "RemediationPack_guideId_objectiveId_key" ON "RemediationPack"("guideId", "objectiveId");

-- CreateIndex
CREATE INDEX "Flashcard_guideId_idx" ON "Flashcard"("guideId");

-- CreateIndex
CREATE INDEX "Flashcard_objectiveId_idx" ON "Flashcard"("objectiveId");

-- CreateIndex
CREATE INDEX "Flashcard_dueAt_idx" ON "Flashcard"("dueAt");

-- CreateIndex
CREATE INDEX "FlashcardReview_flashcardId_idx" ON "FlashcardReview"("flashcardId");

-- AddForeignKey
ALTER TABLE "StudyGuide" ADD CONSTRAINT "StudyGuide_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Objective" ADD CONSTRAINT "Objective_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "StudyGuide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourcePage" ADD CONSTRAINT "SourcePage_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "StudyGuide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceChunk" ADD CONSTRAINT "SourceChunk_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "StudyGuide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceChunk" ADD CONSTRAINT "SourceChunk_sourcePageId_fkey" FOREIGN KEY ("sourcePageId") REFERENCES "SourcePage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "StudyGuide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "Objective"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "StudyGuide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptAnswer" ADD CONSTRAINT "AttemptAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptAnswer" ADD CONSTRAINT "AttemptAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptAnswer" ADD CONSTRAINT "AttemptAnswer_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "Objective"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RemediationPack" ADD CONSTRAINT "RemediationPack_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "StudyGuide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RemediationPack" ADD CONSTRAINT "RemediationPack_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "Objective"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flashcard" ADD CONSTRAINT "Flashcard_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "StudyGuide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flashcard" ADD CONSTRAINT "Flashcard_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "Objective"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardReview" ADD CONSTRAINT "FlashcardReview_flashcardId_fkey" FOREIGN KEY ("flashcardId") REFERENCES "Flashcard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
