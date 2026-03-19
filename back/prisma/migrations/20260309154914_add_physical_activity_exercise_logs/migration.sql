-- CreateTable
CREATE TABLE "PhysicalActivityExercise" (
    "id" SERIAL NOT NULL,
    "physicalActivityId" INTEGER NOT NULL,
    "trainingExerciseId" INTEGER,
    "name" VARCHAR(255) NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "reps" INTEGER,
    "weight" DOUBLE PRECISION,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhysicalActivityExercise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PhysicalActivityExercise_physicalActivityId_idx" ON "PhysicalActivityExercise"("physicalActivityId");

-- AddForeignKey
ALTER TABLE "PhysicalActivityExercise" ADD CONSTRAINT "PhysicalActivityExercise_physicalActivityId_fkey" FOREIGN KEY ("physicalActivityId") REFERENCES "PhysicalActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
