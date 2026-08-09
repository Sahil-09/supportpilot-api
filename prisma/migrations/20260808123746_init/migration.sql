/*
  Warnings:

  - The `sentiment` column on the `feedbacks` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `severity` column on the `feedbacks` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Sentiments" AS ENUM ('POSITIVE', 'NEGATIVE', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'NORMAL', 'HIGH');

-- AlterTable
ALTER TABLE "feedbacks" DROP COLUMN "sentiment",
ADD COLUMN     "sentiment" "Sentiments",
DROP COLUMN "severity",
ADD COLUMN     "severity" "Severity";
