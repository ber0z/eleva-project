import 'dotenv/config';


import { prisma } from '../src/app/lib/prismaClient'
import bcrypt from "bcryptjs";


async function main() {

  // ADMIN
  const admin = await prisma.admin.create({
    data: {
      name: "Super Admin",
      roles: ["superadmin"],
      isActive: true,
    },
  });

  const adminEmail = process.env.ADMIN_EMAIL || "email@example.com";
  const adminHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || "admin123", 10);

  await prisma.authentication.create({
    data: {
      email: adminEmail,
      password: adminHash,
      subjectType: "admin",
      idAdmin: admin.id,
      isBlocked: false,

    },
  });

  console.log("✅ admin criado");
}

main().catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
