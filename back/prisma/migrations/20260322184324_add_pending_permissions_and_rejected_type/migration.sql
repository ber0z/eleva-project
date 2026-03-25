-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'permissions_rejected';

-- AlterTable
ALTER TABLE "ProfessionalLink" ADD COLUMN     "pendingPermissions" "LinkPermission"[];
