import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const cities = [
  ["London", ["Kensington", "Camden", "Richmond", "Islington", "Greenwich", "Hackney"], ["W8", "NW1", "TW9", "N1", "SE10", "E8"], 1850, "/assets/london-apartment-photo.png"],
  ["Manchester", ["Ancoats", "Northern Quarter", "Deansgate", "Salford Quays"], ["M1", "M4", "M3", "M50"], 1050, "/assets/manchester-flat-photo.png"],
  ["Birmingham", ["Jewellery Quarter", "Edgbaston", "Moseley", "Digbeth"], ["B1", "B15", "B13", "B5"], 950, "/assets/birmingham-townhouse-photo.png"],
  ["Bristol", ["Clifton", "Redland", "Harbourside"], ["BS8", "BS6", "BS1"], 1200, "/assets/london-apartment-photo.png"],
  ["Leeds", ["Headingley", "Chapel Allerton", "City Centre"], ["LS6", "LS7", "LS1"], 900, "/assets/manchester-flat-photo.png"],
  ["Bath", ["Lansdown", "Widcombe", "Oldfield Park"], ["BA1", "BA2", "BA2"], 1300, "/assets/birmingham-townhouse-photo.png"]
] as const;

const streets = ["High Street", "Church Road", "Albert Road", "Queen Street", "Station Road", "Park Lane", "King Street", "Victoria Road", "Market Street", "Mill Lane"];
const types = ["Flat", "House", "Studio", "Maisonette"];

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 12);
  const landlord = await prisma.user.upsert({
    where: { email: "landlord@haaste.test" },
    update: {},
    create: {
      email: "landlord@haaste.test",
      name: "Landlord Demo",
      phone: "+44 7000 111111",
      role: UserRole.LANDLORD,
      passwordHash,
      landlordProfile: { create: { companyName: "Haaste Demo Lets" } }
    },
    include: { landlordProfile: true }
  });

  await prisma.user.upsert({
    where: { email: "tenant@haaste.test" },
    update: {},
    create: {
      email: "tenant@haaste.test",
      name: "Tenant Demo",
      phone: "+44 7000 000000",
      role: UserRole.TENANT,
      passwordHash,
      tenantProfile: { create: { affordabilityPcm: 3250, employmentSector: "Finance", referencingProfile: { create: { status: "IN_PROGRESS", currentStep: 3 } } } }
    }
  });

  if (!landlord.landlordProfile) throw new Error("Missing landlord profile");
  await prisma.property.deleteMany({});

  for (let index = 0; index < 100; index += 1) {
    const [city, areas, districts, baseRent, imageUrl] = cities[index % cities.length];
    const area = areas[index % areas.length];
    const postcodeDistrict = districts[index % districts.length];
    const type = types[index % types.length];
    const bedrooms = type === "Studio" ? 1 : (index % 4) + 1;
    const streetName = streets[index % streets.length];
    await prisma.property.create({
      data: {
        landlordProfileId: landlord.landlordProfile.id,
        title: `${area} ${type}`,
        streetName,
        area,
        city,
        postcodeDistrict,
        fullAddress: `${(index % 88) + 2} ${streetName}, ${area}, ${city} ${postcodeDistrict} 1AA`,
        postcode: `${postcodeDistrict} 1AA`,
        type,
        bedrooms,
        bathrooms: bedrooms > 2 ? 2 : 1,
        rentPcm: baseRent + bedrooms * 360 + (index % 7) * 85,
        availableFrom: new Date(`2026-${String((index % 5) + 7).padStart(2, "0")}-${String((index % 25) + 1).padStart(2, "0")}`),
        furnishingStatus: index % 2 === 0 ? "Furnished" : "Unfurnished",
        description: `${bedrooms} bedroom ${type.toLowerCase()} in ${area} with secure rent collection readiness and APT progression.`,
        status: "LIVE",
        verifiedEnquiriesOnly: index % 3 !== 0,
        images: { create: { url: imageUrl, alt: `${area} ${type}`, sortOrder: 0 } }
      }
    });
  }
}

main().finally(async () => prisma.$disconnect());
