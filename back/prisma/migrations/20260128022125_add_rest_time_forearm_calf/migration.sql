/*
  Warnings:

  - You are about to drop the column `calf` on the `Evolution` table. All the data in the column will be lost.
  - You are about to drop the column `forearm` on the `Evolution` table. All the data in the column will be lost.
  - You are about to drop the column `calf` on the `Measure` table. All the data in the column will be lost.
  - You are about to drop the column `forearm` on the `Measure` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Evolution" DROP COLUMN "calf",
DROP COLUMN "forearm",
ADD COLUMN     "leftCalf" DOUBLE PRECISION,
ADD COLUMN     "leftForearm" DOUBLE PRECISION,
ADD COLUMN     "rightCalf" DOUBLE PRECISION,
ADD COLUMN     "rightForearm" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Measure" DROP COLUMN "calf",
DROP COLUMN "forearm",
ADD COLUMN     "leftCalf" DOUBLE PRECISION,
ADD COLUMN     "leftForearm" DOUBLE PRECISION,
ADD COLUMN     "rightCalf" DOUBLE PRECISION,
ADD COLUMN     "rightForearm" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "TrainingExercise" ADD COLUMN     "restTime" INTEGER;
