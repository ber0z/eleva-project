-- CreateEnum
CREATE TYPE "AuthSubjectType" AS ENUM ('user', 'professional', 'admin');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');

-- CreateEnum
CREATE TYPE "ProfessionalRole" AS ENUM ('trainer', 'nutritionist');

-- CreateEnum
CREATE TYPE "LinkStatus" AS ENUM ('pending', 'accepted', 'revoked');

-- CreateEnum
CREATE TYPE "LinkPermission" AS ENUM ('edit_diet', 'edit_training');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('pending', 'accepted', 'declined', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('invite_created', 'invite_accepted', 'diet_assigned', 'training_assigned', 'meal_log_reminder', 'meal_log_submitted', 'file_attached', 'link_revoked');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('low', 'normal', 'high');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('superadmin', 'manager', 'support', 'auditor');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "gender" VARCHAR(255) NOT NULL,
    "profilePicture" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastAccess" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Authentication" (
    "id" SERIAL NOT NULL,
    "subjectType" "AuthSubjectType" NOT NULL DEFAULT 'user',
    "idUser" INTEGER,
    "idProfessional" INTEGER,
    "idAdmin" INTEGER,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "refreshToken" VARCHAR(255),
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "recoveryCode" VARCHAR(255),
    "recoveryCodeExpiresAt" TIMESTAMP(3),
    "lastAccess" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Authentication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Preset" (
    "id" SERIAL NOT NULL,
    "currentGoal" VARCHAR(255) NOT NULL,
    "idUser" INTEGER NOT NULL,
    "terms" VARCHAR(255) NOT NULL,
    "dateSigningTerm" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Preset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Measure" (
    "id" SERIAL NOT NULL,
    "idUser" INTEGER NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "rightBiceps" DOUBLE PRECISION,
    "leftBiceps" DOUBLE PRECISION,
    "rightThigh" DOUBLE PRECISION,
    "leftThigh" DOUBLE PRECISION,
    "waist" DOUBLE PRECISION,
    "hips" DOUBLE PRECISION,
    "chest" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Measure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evolution" (
    "id" SERIAL NOT NULL,
    "idUser" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "goal" TEXT NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "rightBiceps" DOUBLE PRECISION,
    "leftBiceps" DOUBLE PRECISION,
    "rightThigh" DOUBLE PRECISION,
    "leftThigh" DOUBLE PRECISION,
    "waist" DOUBLE PRECISION,
    "hips" DOUBLE PRECISION,
    "chest" DOUBLE PRECISION,
    "message" VARCHAR(512),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evolution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvolutionImage" (
    "id" SERIAL NOT NULL,
    "idEvolution" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "path" VARCHAR(512) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvolutionImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" SERIAL NOT NULL,
    "idUser" INTEGER NOT NULL,
    "idProfessional" INTEGER,
    "description" VARCHAR(512) NOT NULL,
    "path" VARCHAR(512) NOT NULL,
    "fileType" VARCHAR(512) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Diet" (
    "id" SERIAL NOT NULL,
    "idUser" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "notes" VARCHAR(1024),
    "date" DATE NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carbs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "idProfessional" INTEGER,
    "documentPath" VARCHAR(512),
    "documentType" VARCHAR(128),
    "documentSize" INTEGER,

    CONSTRAINT "Diet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DietMeal" (
    "id" SERIAL NOT NULL,
    "idDiet" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "time" VARCHAR(10),
    "meal" VARCHAR(1024) NOT NULL,
    "notes" VARCHAR(1024),
    "protein" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carbs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DietMeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealLogDay" (
    "id" SERIAL NOT NULL,
    "idUser" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "notes" VARCHAR(1024),
    "adherence" INTEGER,
    "totalKcal" INTEGER,
    "protein" DOUBLE PRECISION DEFAULT 0,
    "carbs" DOUBLE PRECISION DEFAULT 0,
    "fat" DOUBLE PRECISION DEFAULT 0,
    "waterMl" INTEGER,
    "dietId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealLogDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealLogEntry" (
    "id" SERIAL NOT NULL,
    "idDay" INTEGER NOT NULL,
    "title" VARCHAR(64) NOT NULL,
    "time" VARCHAR(10),
    "description" VARCHAR(1024) NOT NULL,
    "notes" VARCHAR(512),
    "kcal" INTEGER,
    "protein" DOUBLE PRECISION DEFAULT 0,
    "carbs" DOUBLE PRECISION DEFAULT 0,
    "fat" DOUBLE PRECISION DEFAULT 0,
    "dietMealId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Training" (
    "id" SERIAL NOT NULL,
    "idUser" INTEGER NOT NULL,
    "title" VARCHAR(255),
    "notes" VARCHAR(1024),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "idProfessional" INTEGER,
    "documentPath" VARCHAR(512),
    "documentType" VARCHAR(128),
    "documentSize" INTEGER,

    CONSTRAINT "Training_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingWorkout" (
    "id" SERIAL NOT NULL,
    "idTraining" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "notes" VARCHAR(1024),
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingWorkout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingExercise" (
    "id" SERIAL NOT NULL,
    "idWorkout" INTEGER NOT NULL,
    "exerciseId" INTEGER,
    "name" VARCHAR(255) NOT NULL,
    "technique" VARCHAR(255),
    "sets" INTEGER NOT NULL DEFAULT 0,
    "reps" INTEGER,
    "weight" DOUBLE PRECISION,
    "type" VARCHAR(64),
    "notes" VARCHAR(1024),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "muscleGroup" VARCHAR(64),
    "equipment" VARCHAR(64),
    "difficultyLevel" VARCHAR(64),
    "type" VARCHAR(64),
    "description" VARCHAR(1024),
    "videoUrl" VARCHAR(1024),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhysicalActivity" (
    "id" SERIAL NOT NULL,
    "idUser" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(64),
    "duration" INTEGER NOT NULL,
    "calories" INTEGER,
    "observations" VARCHAR(1024),
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "trainingWorkoutId" INTEGER,

    CONSTRAINT "PhysicalActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sleep" (
    "id" SERIAL NOT NULL,
    "idUser" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "startTime" VARCHAR(10) NOT NULL,
    "endTime" VARCHAR(10) NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "sleepQuality" VARCHAR(64),
    "notes" VARCHAR(1024),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sleep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Professional" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "roles" "ProfessionalRole"[],
    "profilePicture" VARCHAR(255),
    "bio" VARCHAR(1024),
    "crefNumber" VARCHAR(64),
    "crnNumber" VARCHAR(64),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "contactPhone" VARCHAR(32),
    "whatsapp" VARCHAR(32),
    "instagram" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastAccess" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Professional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalLink" (
    "id" SERIAL NOT NULL,
    "professionalId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" "LinkStatus" NOT NULL DEFAULT 'pending',
    "permissions" "LinkPermission"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalInvite" (
    "id" SERIAL NOT NULL,
    "professionalId" INTEGER NOT NULL,
    "userId" INTEGER,
    "inviteeEmail" VARCHAR(255),
    "inviteePhone" VARCHAR(32),
    "status" "InviteStatus" NOT NULL DEFAULT 'pending',
    "code" VARCHAR(64) NOT NULL,
    "token" VARCHAR(128) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "message" VARCHAR(1024),
    "permissions" "LinkPermission"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "professionalId" INTEGER,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" VARCHAR(1024),
    "data" JSONB,
    "linkWeb" VARCHAR(1024),
    "linkApp" VARCHAR(1024),
    "priority" "NotificationPriority" NOT NULL DEFAULT 'normal',
    "scheduledAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "dietId" INTEGER,
    "trainingId" INTEGER,
    "actorProfessionalId" INTEGER,
    "actorUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "roles" "AdminRole"[],
    "profilePicture" VARCHAR(255),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyMetric" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "signups" INTEGER NOT NULL DEFAULT 0,
    "activeUsers" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Authentication_email_key" ON "Authentication"("email");

-- CreateIndex
CREATE INDEX "Authentication_subjectType_idx" ON "Authentication"("subjectType");

-- CreateIndex
CREATE INDEX "Authentication_idUser_idx" ON "Authentication"("idUser");

-- CreateIndex
CREATE INDEX "Authentication_idProfessional_idx" ON "Authentication"("idProfessional");

-- CreateIndex
CREATE INDEX "Authentication_idAdmin_idx" ON "Authentication"("idAdmin");

-- CreateIndex
CREATE UNIQUE INDEX "Preset_idUser_key" ON "Preset"("idUser");

-- CreateIndex
CREATE UNIQUE INDEX "Measure_idUser_key" ON "Measure"("idUser");

-- CreateIndex
CREATE INDEX "Diet_idUser_date_idx" ON "Diet"("idUser", "date");

-- CreateIndex
CREATE INDEX "Diet_idProfessional_idx" ON "Diet"("idProfessional");

-- CreateIndex
CREATE INDEX "DietMeal_idDiet_idx" ON "DietMeal"("idDiet");

-- CreateIndex
CREATE INDEX "MealLogDay_dietId_idx" ON "MealLogDay"("dietId");

-- CreateIndex
CREATE UNIQUE INDEX "MealLogDay_idUser_date_key" ON "MealLogDay"("idUser", "date");

-- CreateIndex
CREATE INDEX "MealLogEntry_idDay_idx" ON "MealLogEntry"("idDay");

-- CreateIndex
CREATE INDEX "MealLogEntry_dietMealId_idx" ON "MealLogEntry"("dietMealId");

-- CreateIndex
CREATE INDEX "Training_idUser_idx" ON "Training"("idUser");

-- CreateIndex
CREATE INDEX "Training_idProfessional_idx" ON "Training"("idProfessional");

-- CreateIndex
CREATE INDEX "TrainingWorkout_idTraining_dayOfWeek_idx" ON "TrainingWorkout"("idTraining", "dayOfWeek");

-- CreateIndex
CREATE INDEX "TrainingExercise_idWorkout_idx" ON "TrainingExercise"("idWorkout");

-- CreateIndex
CREATE INDEX "TrainingExercise_exerciseId_idx" ON "TrainingExercise"("exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_name_key" ON "Exercise"("name");

-- CreateIndex
CREATE INDEX "PhysicalActivity_idUser_date_idx" ON "PhysicalActivity"("idUser", "date");

-- CreateIndex
CREATE INDEX "Sleep_idUser_date_idx" ON "Sleep"("idUser", "date");

-- CreateIndex
CREATE INDEX "Professional_contactPhone_idx" ON "Professional"("contactPhone");

-- CreateIndex
CREATE INDEX "Professional_whatsapp_idx" ON "Professional"("whatsapp");

-- CreateIndex
CREATE INDEX "Professional_instagram_idx" ON "Professional"("instagram");

-- CreateIndex
CREATE INDEX "ProfessionalLink_userId_status_idx" ON "ProfessionalLink"("userId", "status");

-- CreateIndex
CREATE INDEX "ProfessionalLink_professionalId_status_idx" ON "ProfessionalLink"("professionalId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalLink_professionalId_userId_key" ON "ProfessionalLink"("professionalId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalInvite_code_key" ON "ProfessionalInvite"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalInvite_token_key" ON "ProfessionalInvite"("token");

-- CreateIndex
CREATE INDEX "ProfessionalInvite_professionalId_status_idx" ON "ProfessionalInvite"("professionalId", "status");

-- CreateIndex
CREATE INDEX "ProfessionalInvite_userId_idx" ON "ProfessionalInvite"("userId");

-- CreateIndex
CREATE INDEX "ProfessionalInvite_token_idx" ON "ProfessionalInvite"("token");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_professionalId_readAt_idx" ON "Notification"("professionalId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_dietId_idx" ON "Notification"("dietId");

-- CreateIndex
CREATE INDEX "Notification_trainingId_idx" ON "Notification"("trainingId");

-- CreateIndex
CREATE INDEX "Notification_actorProfessionalId_idx" ON "Notification"("actorProfessionalId");

-- CreateIndex
CREATE INDEX "Notification_actorUserId_idx" ON "Notification"("actorUserId");

-- CreateIndex
CREATE INDEX "Notification_scheduledAt_idx" ON "Notification"("scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyMetric_date_key" ON "DailyMetric"("date");

-- AddForeignKey
ALTER TABLE "Authentication" ADD CONSTRAINT "Authentication_idProfessional_fkey" FOREIGN KEY ("idProfessional") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Authentication" ADD CONSTRAINT "Authentication_idAdmin_fkey" FOREIGN KEY ("idAdmin") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Authentication" ADD CONSTRAINT "Authentication_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Preset" ADD CONSTRAINT "Preset_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Measure" ADD CONSTRAINT "Measure_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evolution" ADD CONSTRAINT "Evolution_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvolutionImage" ADD CONSTRAINT "EvolutionImage_idEvolution_fkey" FOREIGN KEY ("idEvolution") REFERENCES "Evolution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_idProfessional_fkey" FOREIGN KEY ("idProfessional") REFERENCES "Professional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diet" ADD CONSTRAINT "Diet_idProfessional_fkey" FOREIGN KEY ("idProfessional") REFERENCES "Professional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diet" ADD CONSTRAINT "Diet_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietMeal" ADD CONSTRAINT "DietMeal_idDiet_fkey" FOREIGN KEY ("idDiet") REFERENCES "Diet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealLogDay" ADD CONSTRAINT "MealLogDay_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealLogDay" ADD CONSTRAINT "MealLogDay_dietId_fkey" FOREIGN KEY ("dietId") REFERENCES "Diet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealLogEntry" ADD CONSTRAINT "MealLogEntry_dietMealId_fkey" FOREIGN KEY ("dietMealId") REFERENCES "DietMeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealLogEntry" ADD CONSTRAINT "MealLogEntry_idDay_fkey" FOREIGN KEY ("idDay") REFERENCES "MealLogDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Training" ADD CONSTRAINT "Training_idProfessional_fkey" FOREIGN KEY ("idProfessional") REFERENCES "Professional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Training" ADD CONSTRAINT "Training_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingWorkout" ADD CONSTRAINT "TrainingWorkout_idTraining_fkey" FOREIGN KEY ("idTraining") REFERENCES "Training"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingExercise" ADD CONSTRAINT "TrainingExercise_idWorkout_fkey" FOREIGN KEY ("idWorkout") REFERENCES "TrainingWorkout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingExercise" ADD CONSTRAINT "TrainingExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalActivity" ADD CONSTRAINT "PhysicalActivity_trainingWorkoutId_fkey" FOREIGN KEY ("trainingWorkoutId") REFERENCES "TrainingWorkout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalActivity" ADD CONSTRAINT "PhysicalActivity_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sleep" ADD CONSTRAINT "Sleep_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalLink" ADD CONSTRAINT "ProfessionalLink_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalLink" ADD CONSTRAINT "ProfessionalLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalInvite" ADD CONSTRAINT "ProfessionalInvite_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalInvite" ADD CONSTRAINT "ProfessionalInvite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_dietId_fkey" FOREIGN KEY ("dietId") REFERENCES "Diet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "Training"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorProfessionalId_fkey" FOREIGN KEY ("actorProfessionalId") REFERENCES "Professional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
