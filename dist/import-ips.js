"use strict";
// Imports IPs from a file into the database
// Assumes IPs are listening on port 25565 but have not yet been scanned
// IPs are read from stdin, one per line
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
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var util_1 = require("./util");
var client_1 = require("@prisma/client");
var fs_1 = __importDefault(require("fs"));
function readLines() {
    return fs_1["default"].readFileSync(0).toString().split("\n");
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var lines, ips, prisma, massInsert, _i, ips_1, ip;
        return __generator(this, function (_a) {
            lines = readLines();
            console.log(lines.length + " lines read");
            ips = lines.map(function (line) {
                if (line.length == 0)
                    return null;
                var ip = (0, util_1.ip2int)(line.split(" ")[3]); // ex: open tcp 25565 45.43.233.225 1671854414
                return ip;
            });
            console.log(ips);
            console.log(ips.length + " IPs to import");
            prisma = new client_1.PrismaClient();
            massInsert = [];
            for (_i = 0, ips_1 = ips; _i < ips_1.length; _i++) {
                ip = ips_1[_i];
                if (typeof ip != "number")
                    continue;
                massInsert.push({ ip: ip });
            }
            console.log(massInsert.length + " IPs to insert");
            prisma.server
                .createMany({
                data: massInsert,
                skipDuplicates: true
            })
                .then(function () {
                console.log("Done");
            });
            return [2 /*return*/];
        });
    });
}
main();
