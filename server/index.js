var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient, UserRole } from "@prisma/client";
var prisma = new PrismaClient();
var app = express();
var jwtSecret = process.env.JWT_SECRET || "development-only-secret";
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.get("/api/health", function (_req, res) {
    res.json({ ok: true, service: "hilltro-api" });
});
app.post("/api/auth/register", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, name, email, password, phone, role, passwordHash, user;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, name = _a.name, email = _a.email, password = _a.password, phone = _a.phone, role = _a.role;
                return [4 /*yield*/, bcrypt.hash(password, 12)];
            case 1:
                passwordHash = _b.sent();
                return [4 /*yield*/, prisma.user.create({
                        data: {
                            name: name,
                            email: String(email).toLowerCase(),
                            phone: phone,
                            role: role === "LANDLORD" ? UserRole.LANDLORD : UserRole.TENANT,
                            passwordHash: passwordHash,
                            tenantProfile: role === "TENANT" ? { create: { referencingProfile: { create: {} } } } : undefined,
                            landlordProfile: role === "LANDLORD" ? { create: {} } : undefined,
                            auditLogs: { create: { action: "Account Created", entity: "User" } }
                        }
                    })];
            case 2:
                user = _b.sent();
                res.json({ user: publicUser(user), token: tokenFor(user.id) });
                return [2 /*return*/];
        }
    });
}); });
app.post("/api/auth/login", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, email, password, user, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _a = req.body, email = _a.email, password = _a.password;
                return [4 /*yield*/, prisma.user.findUnique({ where: { email: String(email).toLowerCase() } })];
            case 1:
                user = _c.sent();
                _b = !user;
                if (_b) return [3 /*break*/, 3];
                return [4 /*yield*/, bcrypt.compare(password, user.passwordHash)];
            case 2:
                _b = !(_c.sent());
                _c.label = 3;
            case 3:
                if (_b) {
                    res.status(401).json({ error: "Invalid credentials" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, prisma.auditLog.create({ data: { userId: user.id, action: "Login", entity: "User", entityId: user.id } })];
            case 4:
                _c.sent();
                res.json({ user: publicUser(user), token: tokenFor(user.id) });
                return [2 /*return*/];
        }
    });
}); });
app.get("/api/properties", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var location, maxPrice, properties;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                location = String(req.query.location || "").toLowerCase();
                maxPrice = Number(req.query.maxPrice || 0);
                return [4 /*yield*/, prisma.property.findMany({
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
                    })];
            case 1:
                properties = _a.sent();
                res.json(properties.map(function (property) { return (__assign(__assign({}, property), { fullAddress: "".concat(property.streetName, ", ").concat(property.area, ", ").concat(property.city, " ").concat(property.postcodeDistrict), postcode: property.postcodeDistrict, slightlyAboveBudget: maxPrice > 0 && property.rentPcm > maxPrice && property.rentPcm <= Math.round(maxPrice * 1.15) })); }));
                return [2 /*return*/];
        }
    });
}); });
app.post("/api/photography-requests", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var request;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.photographerRequest.create({ data: req.body })];
            case 1:
                request = _a.sent();
                res.json(request);
                return [2 /*return*/];
        }
    });
}); });
function tokenFor(userId) {
    return jwt.sign({ sub: userId }, jwtSecret, { expiresIn: "15m" });
}
function publicUser(user) {
    return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role };
}
var port = Number(process.env.PORT || 8787);
app.listen(port, function () {
    console.log("Hilltro API listening on http://localhost:".concat(port));
});
