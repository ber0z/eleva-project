-- CreateTable
CREATE TABLE "Anamnesis" (
    "id" SERIAL NOT NULL,
    "idUser" INTEGER NOT NULL,
    "healthConditions" VARCHAR(1024),
    "medications" VARCHAR(512),
    "injuries" VARCHAR(512),
    "physicalLimitations" VARCHAR(512),
    "experienceLevel" VARCHAR(64),
    "workoutsPerWeek" INTEGER,
    "preferredWorkoutTime" VARCHAR(64),
    "availableEquipment" VARCHAR(512),
    "dietaryRestrictions" VARCHAR(512),
    "foodAllergies" VARCHAR(512),
    "likedFoods" VARCHAR(1024),
    "dislikedFoods" VARCHAR(1024),
    "mealFrequency" INTEGER,
    "waterIntakeMl" INTEGER,
    "occupation" VARCHAR(255),
    "dailyActivityLevel" VARCHAR(64),
    "stressLevel" VARCHAR(32),
    "mainGoal" VARCHAR(512),
    "motivation" VARCHAR(512),
    "notes" VARCHAR(1024),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Anamnesis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Anamnesis_idUser_key" ON "Anamnesis"("idUser");

-- AddForeignKey
ALTER TABLE "Anamnesis" ADD CONSTRAINT "Anamnesis_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
