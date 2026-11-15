CREATE TABLE "CollectionToken" (
    "id" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "volunteerId" UUID NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CollectionToken_assignmentId_key" ON "CollectionToken"("assignmentId");
CREATE UNIQUE INDEX "CollectionToken_tokenHash_key" ON "CollectionToken"("tokenHash");
CREATE INDEX "CollectionToken_expiresAt_idx" ON "CollectionToken"("expiresAt");

ALTER TABLE "CollectionToken" ADD CONSTRAINT "CollectionToken_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CollectionToken" ADD CONSTRAINT "CollectionToken_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
