CREATE TYPE "Role" AS ENUM ('DONOR', 'NGO', 'VOLUNTEER', 'ADMIN');
CREATE TYPE "DonationStatus" AS ENUM ('AVAILABLE', 'PARTIALLY_RESERVED', 'FULLY_RESERVED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'VOLUNTEER_ASSIGNED', 'COLLECTED', 'DELIVERED', 'COMPLETED');
CREATE TYPE "AssignmentStatus" AS ENUM ('OPEN', 'ACCEPTED', 'COLLECTED', 'DELIVERED', 'CANCELLED');
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'COLLECTED', 'DELIVERED', 'CONFIRMED', 'CANCELLED');
CREATE TABLE "User" (
  "id" UUID NOT NULL, "name" TEXT NOT NULL, "email" TEXT NOT NULL, "passwordHash" TEXT NOT NULL, "role" "Role" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Organization" (
  "id" UUID NOT NULL, "userId" UUID NOT NULL, "name" TEXT NOT NULL, "address" TEXT NOT NULL, "phone" TEXT,
  "verified" BOOLEAN NOT NULL DEFAULT false, "verifiedAt" TIMESTAMP(3), "verifiedById" UUID, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "VolunteerProfile" (
  "id" UUID NOT NULL, "userId" UUID NOT NULL, "available" BOOLEAN NOT NULL DEFAULT true, "phone" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VolunteerProfile_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Donation" (
  "id" UUID NOT NULL, "donorId" UUID NOT NULL, "foodName" TEXT NOT NULL, "category" TEXT NOT NULL, "quantity" INTEGER NOT NULL,
  "availableQuantity" INTEGER NOT NULL, "unit" TEXT NOT NULL, "preparedAt" TIMESTAMP(3) NOT NULL, "collectionDeadline" TIMESTAMP(3) NOT NULL,
  "pickupAddress" TEXT NOT NULL, "description" TEXT, "status" "DonationStatus" NOT NULL DEFAULT 'AVAILABLE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Donation_pkey" PRIMARY KEY ("id"), CONSTRAINT "Donation_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "Donation_available_quantity_check" CHECK ("availableQuantity" >= 0 AND "availableQuantity" <= "quantity")
);
CREATE TABLE "Request" (
  "id" UUID NOT NULL, "donationId" UUID NOT NULL, "organizationId" UUID NOT NULL, "quantity" INTEGER NOT NULL, "note" TEXT,
  "status" "RequestStatus" NOT NULL DEFAULT 'PENDING', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Request_pkey" PRIMARY KEY ("id"), CONSTRAINT "Request_quantity_check" CHECK ("quantity" > 0)
);
CREATE TABLE "Assignment" (
  "id" UUID NOT NULL, "requestId" UUID NOT NULL, "volunteerId" UUID, "status" "AssignmentStatus" NOT NULL DEFAULT 'OPEN',
  "acceptedAt" TIMESTAMP(3), "collectedAt" TIMESTAMP(3), "deliveredAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Delivery" (
  "id" UUID NOT NULL, "assignmentId" UUID NOT NULL, "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "collectedAt" TIMESTAMP(3), "deliveredAt" TIMESTAMP(3), "confirmedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Organization_userId_key" ON "Organization"("userId");
CREATE UNIQUE INDEX "VolunteerProfile_userId_key" ON "VolunteerProfile"("userId");
CREATE UNIQUE INDEX "Assignment_requestId_key" ON "Assignment"("requestId");
CREATE UNIQUE INDEX "Delivery_assignmentId_key" ON "Delivery"("assignmentId");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "Organization_verified_idx" ON "Organization"("verified");
CREATE INDEX "Donation_status_collectionDeadline_idx" ON "Donation"("status", "collectionDeadline");
CREATE INDEX "Donation_donorId_createdAt_idx" ON "Donation"("donorId", "createdAt");
CREATE INDEX "Donation_category_idx" ON "Donation"("category");
CREATE INDEX "Request_donationId_status_idx" ON "Request"("donationId", "status");
CREATE INDEX "Request_organizationId_createdAt_idx" ON "Request"("organizationId", "createdAt");
CREATE INDEX "Request_status_createdAt_idx" ON "Request"("status", "createdAt");
CREATE INDEX "Assignment_volunteerId_status_idx" ON "Assignment"("volunteerId", "status");
CREATE INDEX "Assignment_status_createdAt_idx" ON "Assignment"("status", "createdAt");
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VolunteerProfile" ADD CONSTRAINT "VolunteerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Request" ADD CONSTRAINT "Request_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "Donation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Request" ADD CONSTRAINT "Request_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
