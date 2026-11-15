import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/config/db.js";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!email || email === "admin@example.com" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Set a real ADMIN_EMAIL in apps/api/.env");
if (!password || password.length < 16 || /CHANGE_ME|use-a-unique-password/i.test(password)) throw new Error("Set a unique ADMIN_PASSWORD of at least 16 characters in apps/api/.env");
async function main() {
  try {
    const existingAdmin = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
    if (existingAdmin) throw new Error("An admin account already exists; refusing to create another");
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) throw new Error("That email already has an account; bootstrap only creates a new admin user");
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({ data: { name: "RePlate Administrator", email, passwordHash, role: "ADMIN" } });
    console.log("Admin account created successfully");
  } finally {
    await prisma.$disconnect();
  }
}
void main();
