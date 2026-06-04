import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient, UserRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: ReturnType<typeof publicUser>;
    }
  }
}

const prisma = new PrismaClient();
const app = express();
const jwtSecret = process.env.JWT_SECRET || "development-only-secret";
const CONTACT_BLOCKER = /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})|(\+?\d[\d\s().-]{7,}\d)|(https?:\/\/|www\.)|(@[a-z0-9_]{3,})|(whatsapp|telegram|instagram|facebook|tiktok)/i;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "haaste-api" });
});

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password, phone, role } = req.body;
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name,
      email: String(email).toLowerCase(),
      phone,
      role: role === "LANDLORD" ? UserRole.LANDLORD : UserRole.TENANT,
      passwordHash,
      tenantProfile: role === "TENANT" ? { create: { referencingProfile: { create: {} } } } : undefined,
      landlordProfile: role === "LANDLORD" ? { create: {} } : undefined,
      auditLogs: { create: { action: "Account Created", entity: "User" } }
    }
  });
  res.json({ user: publicUser(user), token: tokenFor(user.id) });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase() } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  await prisma.auditLog.create({ data: { userId: user.id, action: "Login", entity: "User", entityId: user.id } });
  res.json({ user: publicUser(user), token: tokenFor(user.id) });
});

app.get("/api/properties", async (req, res) => {
  const location = String(req.query.location || "").toLowerCase();
  const maxPrice = Number(req.query.maxPrice || 0);
  const properties = await prisma.property.findMany({
    where: {
      status: "LIVE",
      OR: location ? [
        { city: { contains: location, mode: "insensitive" } },
        { area: { contains: location, mode: "insensitive" } },
        { postcodeDistrict: { contains: location, mode: "insensitive" } }
      ] : undefined
    },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    take: 100
  });
  res.json(properties.map((property) => ({
    ...property,
    fullAddress: `${property.streetName}, ${property.area}, ${property.city} ${property.postcodeDistrict}`,
    postcode: property.postcodeDistrict,
    slightlyAboveBudget: maxPrice > 0 && property.rentPcm > maxPrice && property.rentPcm <= Math.round(maxPrice * 1.15)
  })));
});

app.get("/api/properties/:id", async (req, res) => {
  const property = await prisma.property.findUnique({
    where: { id: req.params.id },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } }
  });
  if (!property) {
    res.status(404).json({ error: "Property not found" });
    return;
  }
  res.json({
    ...property,
    fullAddress: `${property.streetName}, ${property.area}, ${property.city} ${property.postcodeDistrict}`,
    postcode: property.postcodeDistrict,
    imageUrl: property.images[0]?.url || "/assets/london-apartment-photo.png"
  });
});

app.post("/api/saved-properties", requireUser, async (req, res) => {
  const user = req.user!;
  const tenant = await prisma.tenantProfile.findUnique({ where: { userId: user.id } });
  if (!tenant) {
    res.status(403).json({ error: "Tenant account required" });
    return;
  }
  const saved = await prisma.savedProperty.upsert({
    where: { tenantProfileId_propertyId: { tenantProfileId: tenant.id, propertyId: req.body.propertyId } },
    update: {},
    create: { tenantProfileId: tenant.id, propertyId: req.body.propertyId }
  });
  res.json(saved);
});

app.post("/api/property-drafts", requireUser, async (req, res) => {
  const user = req.user!;
  const landlord = await prisma.landlordProfile.findUnique({ where: { userId: user.id } });
  if (!landlord) {
    res.status(403).json({ error: "Landlord account required" });
    return;
  }
  const property = await prisma.property.create({
    data: {
      landlordProfileId: landlord.id,
      title: req.body.title || "Draft property",
      streetName: req.body.streetName || "Address pending",
      area: req.body.area || "Area pending",
      city: req.body.city || "London",
      postcodeDistrict: req.body.postcodeDistrict || "W8",
      fullAddress: req.body.fullAddress || `${req.body.streetName || "Address pending"}, ${req.body.area || "Area pending"}, ${req.body.city || "London"} ${req.body.postcodeDistrict || "W8"}`,
      postcode: req.body.postcode || `${req.body.postcodeDistrict || "W8"} 1AA`,
      type: req.body.type || "Flat",
      bedrooms: Number(req.body.bedrooms || 1),
      bathrooms: Number(req.body.bathrooms || 1),
      rentPcm: Number(req.body.rentPcm || 0),
      availableFrom: req.body.availableFrom ? new Date(req.body.availableFrom) : new Date(),
      furnishingStatus: req.body.furnishingStatus || "Furnished",
      description: req.body.description || "Draft listing created in Haaste.",
      status: "DRAFT",
      verifiedEnquiriesOnly: true
    }
  });
  res.json({
    ...property,
    fullAddress: `${property.streetName}, ${property.area}, ${property.city} ${property.postcodeDistrict}`,
    postcode: property.postcodeDistrict,
    imageUrl: "/assets/london-apartment-photo.png"
  });
});

app.post("/api/properties/:id/publish", requireUser, async (req, res) => {
  const propertyId = String(req.params.id);
  const property = await prisma.property.update({ where: { id: propertyId }, data: { status: "LIVE" } });
  res.json(property);
});

app.get("/api/conversations", requireUser, async (req, res) => {
  const conversations = await prisma.conversation.findMany({
    where: { messages: { some: { senderId: req.user!.id } } },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 50 } },
    orderBy: { updatedAt: "desc" }
  });
  if (conversations.length === 0) {
    res.json([{
      id: "demo-conversation",
      subject: "Well Road offer",
      unreadCount: 1,
      messages: [{ id: "demo-message", senderId: "system", body: "Your referenced offer is ready for landlord review.", createdAt: "09:21" }]
    }]);
    return;
  }
  res.json(conversations.map((conversation) => ({
    id: conversation.id,
    subject: conversation.subject,
    unreadCount: conversation.messages.filter((message) => !message.readAt && message.senderId !== req.user!.id).length,
    messages: conversation.messages.map((message) => ({
      id: message.id,
      senderId: message.senderId,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
      readAt: message.readAt?.toISOString(),
      attachmentUrl: message.attachmentUrl || undefined
    }))
  })));
});

app.post("/api/conversations/:id/messages", requireUser, async (req, res) => {
  const conversationId = String(req.params.id);
  if (CONTACT_BLOCKER.test(String(req.body.body || ""))) {
    res.status(422).json({ error: "For your safety, personal contact information can only be shared after a viewing has been completed." });
    return;
  }
  const conversation = await prisma.conversation.findFirst({ where: { id: conversationId } });
  if (!conversation) {
    res.json({ ok: true });
    return;
  }
  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: req.user!.id,
      body: String(req.body.body || ""),
      attachmentUrl: req.body.attachmentUrl || null
    }
  });
  res.json(message);
});

app.get("/api/referencing/steps", requireUser, (_req, res) => {
  res.json(["Personal Details", "Identity Verification", "Address History", "Employment Information", "Income Information", "Open Banking", "Credit Check", "Review"].map((title, index) => ({
    id: `step-${index + 1}`,
    title,
    description: "Average completion time: 6 minutes.",
    status: index === 0 ? "current" : "locked"
  })));
});

app.post("/api/referencing/steps/:id/complete", requireUser, async (req, res) => {
  await prisma.auditLog.create({ data: { userId: req.user!.id, action: "Referencing Step Completed", entity: "ReferencingStep", entityId: String(req.params.id) } });
  res.json({ ok: true });
});

app.get("/api/tenant-passport", requireUser, (_req, res) => {
  res.json({
    verificationStatus: "Verified",
    affordabilityPcm: 3250,
    riskGrade: "Low",
    employmentSector: "Finance",
    completionDate: new Date().toISOString()
  });
});

app.post("/api/photography-requests", async (req, res) => {
  const request = await prisma.photographerRequest.create({ data: req.body });
  res.json(request);
});

function tokenFor(userId: string) {
  return jwt.sign({ sub: userId }, jwtSecret, { expiresIn: "15m" });
}

function publicUser(user: { id: string; name: string; email: string; phone: string | null; role: UserRole }) {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role };
}

async function requireUser(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : "";
  try {
    const payload = jwt.verify(token, jwtSecret) as { sub?: string };
    const user = payload.sub ? await prisma.user.findUnique({ where: { id: payload.sub } }) : null;
    if (!user) throw new Error("Unauthorised");
    req.user = publicUser(user);
    next();
  } catch {
    res.status(401).json({ error: "Unauthorised" });
  }
}

const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
  console.log(`Haaste API listening on http://localhost:${port}`);
});
