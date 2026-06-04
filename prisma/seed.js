var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
var prisma = new PrismaClient();
var cities = [
    ["London", ["Kensington", "Camden", "Richmond", "Islington", "Greenwich", "Hackney"], ["W8", "NW1", "TW9", "N1", "SE10", "E8"], 1850, "/assets/london-apartment-photo.png"],
    ["Manchester", ["Ancoats", "Northern Quarter", "Deansgate", "Salford Quays"], ["M1", "M4", "M3", "M50"], 1050, "/assets/manchester-flat-photo.png"],
    ["Birmingham", ["Jewellery Quarter", "Edgbaston", "Moseley", "Digbeth"], ["B1", "B15", "B13", "B5"], 950, "/assets/birmingham-townhouse-photo.png"],
    ["Bristol", ["Clifton", "Redland", "Harbourside"], ["BS8", "BS6", "BS1"], 1200, "/assets/london-apartment-photo.png"],
    ["Leeds", ["Headingley", "Chapel Allerton", "City Centre"], ["LS6", "LS7", "LS1"], 900, "/assets/manchester-flat-photo.png"],
    ["Bath", ["Lansdown", "Widcombe", "Oldfield Park"], ["BA1", "BA2", "BA2"], 1300, "/assets/birmingham-townhouse-photo.png"]
];
var streets = ["High Street", "Church Road", "Albert Road", "Queen Street", "Station Road", "Park Lane", "King Street", "Victoria Road", "Market Street", "Mill Lane"];
var types = ["Flat", "House", "Studio", "Maisonette"];
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var passwordHash, landlord, index, _a, city, areas, districts, baseRent, imageUrl, area, postcodeDistrict, type, bedrooms, streetName;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, bcrypt.hash("Password123!", 12)];
                case 1:
                    passwordHash = _b.sent();
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: "landlord@haaste.test" },
                            update: {},
                            create: {
                                email: "landlord@haaste.test",
                                name: "Landlord Demo",
                                phone: "+44 7000 111111",
                                role: UserRole.LANDLORD,
                                passwordHash: passwordHash,
                                landlordProfile: { create: { companyName: "Haaste Demo Lets" } }
                            },
                            include: { landlordProfile: true }
                        })];
                case 2:
                    landlord = _b.sent();
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: "tenant@haaste.test" },
                            update: {},
                            create: {
                                email: "tenant@haaste.test",
                                name: "Tenant Demo",
                                phone: "+44 7000 000000",
                                role: UserRole.TENANT,
                                passwordHash: passwordHash,
                                tenantProfile: { create: { affordabilityPcm: 3250, employmentSector: "Finance", referencingProfile: { create: { status: "IN_PROGRESS", currentStep: 3 } } } }
                            }
                        })];
                case 3:
                    _b.sent();
                    if (!landlord.landlordProfile)
                        throw new Error("Missing landlord profile");
                    return [4 /*yield*/, prisma.property.deleteMany({})];
                case 4:
                    _b.sent();
                    index = 0;
                    _b.label = 5;
                case 5:
                    if (!(index < 100)) return [3 /*break*/, 8];
                    _a = cities[index % cities.length], city = _a[0], areas = _a[1], districts = _a[2], baseRent = _a[3], imageUrl = _a[4];
                    area = areas[index % areas.length];
                    postcodeDistrict = districts[index % districts.length];
                    type = types[index % types.length];
                    bedrooms = type === "Studio" ? 1 : (index % 4) + 1;
                    streetName = streets[index % streets.length];
                    return [4 /*yield*/, prisma.property.create({
                            data: {
                                landlordProfileId: landlord.landlordProfile.id,
                                title: "".concat(area, " ").concat(type),
                                streetName: streetName,
                                area: area,
                                city: city,
                                postcodeDistrict: postcodeDistrict,
                                fullAddress: "".concat((index % 88) + 2, " ").concat(streetName, ", ").concat(area, ", ").concat(city, " ").concat(postcodeDistrict, " 1AA"),
                                postcode: "".concat(postcodeDistrict, " 1AA"),
                                type: type,
                                bedrooms: bedrooms,
                                bathrooms: bedrooms > 2 ? 2 : 1,
                                rentPcm: baseRent + bedrooms * 360 + (index % 7) * 85,
                                availableFrom: new Date("2026-".concat(String((index % 5) + 7).padStart(2, "0"), "-").concat(String((index % 25) + 1).padStart(2, "0"))),
                                furnishingStatus: index % 2 === 0 ? "Furnished" : "Unfurnished",
                                description: "".concat(bedrooms, " bedroom ").concat(type.toLowerCase(), " in ").concat(area, " with secure rent collection readiness and APT progression."),
                                status: "LIVE",
                                verifiedEnquiriesOnly: index % 3 !== 0,
                                images: { create: { url: imageUrl, alt: "".concat(area, " ").concat(type), sortOrder: 0 } }
                            }
                        })];
                case 6:
                    _b.sent();
                    _b.label = 7;
                case 7:
                    index += 1;
                    return [3 /*break*/, 5];
                case 8: return [2 /*return*/];
            }
        });
    });
}
main().finally(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
    return [2 /*return*/, prisma.$disconnect()];
}); }); });
