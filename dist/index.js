"use strict";
// Slowly scans IP addresses in a database, like a sloth would to avoid trouble
// Assumes IPs are listening on port 25565
// IPs are read from oldest to newest
// IPs are marked as scanned when they are scanned
// If a server was never scanned and does not respond to a ping, it is deleted from the database (it is probably some sort of honeypot)
// But if a server does not respond to a ping but has been online before, it is logged as offline in the ServerHistory model
// If a server responds to a ping, server information is logged to the ServerHistory model
// Player information is also added to the database, along with their history
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
var minecraft_protocol_1 = __importDefault(require("minecraft-protocol"));
var client_1 = require("@prisma/client");
var util_1 = require("./util");
function scanner(scanner_number) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u;
    return __awaiter(this, void 0, void 0, function () {
        var prisma, server, address, response, e_1, version_name, version_protocol, player_count, player_max, player_list, description, e_2, _i, player_list_1, player, uuid, username, player_row, e_3, _v, _w;
        return __generator(this, function (_x) {
            switch (_x.label) {
                case 0:
                    prisma = new client_1.PrismaClient();
                    console.log("Scanner ".concat(scanner_number, " started"));
                    _x.label = 1;
                case 1:
                    if (!true) return [3 /*break*/, 28];
                    _x.label = 2;
                case 2:
                    _x.trys.push([2, 26, , 27]);
                    return [4 /*yield*/, prisma.server.findFirst({
                            orderBy: [{ last_scanned: "asc" }]
                        })];
                case 3:
                    server = _x.sent();
                    if (server == null) {
                        console.log("No servers to scan");
                        return [3 /*break*/, 28];
                    }
                    // mark the server as scanned
                    return [4 /*yield*/, prisma.server.update({
                            where: { ip: server.ip },
                            data: { scanned: true, last_scanned: new Date() }
                        })];
                case 4:
                    // mark the server as scanned
                    _x.sent();
                    address = (0, util_1.int2ip)(server.ip);
                    response = void 0;
                    console.log("Pinging ".concat(address));
                    _x.label = 5;
                case 5:
                    _x.trys.push([5, 7, , 11]);
                    return [4 /*yield*/, (0, util_1.promiseWithTimeout)(minecraft_protocol_1["default"].ping({
                            host: address
                        }), 5000 // 5 second timeout (for faster scanning)
                        )];
                case 6:
                    // ping the server
                    response = _x.sent();
                    return [3 /*break*/, 11];
                case 7:
                    e_1 = _x.sent();
                    console.log("Could not ping ".concat((0, util_1.int2ip)(server.ip), ": ").concat(e_1.message));
                    if (!!server.scanned) return [3 /*break*/, 8];
                    return [3 /*break*/, 10];
                case 8: 
                // if the server has been scanned before, log it as offline
                return [4 /*yield*/, prisma.serverSnapshot.create({
                        data: {
                            ip: server.ip,
                            online: false
                        }
                    })];
                case 9:
                    // if the server has been scanned before, log it as offline
                    _x.sent();
                    _x.label = 10;
                case 10: return [3 /*break*/, 1];
                case 11:
                    version_name = (_c = (_b = (_a = response.version) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : response.version) !== null && _c !== void 0 ? _c : "Unknown";
                    version_protocol = (_f = (_e = (_d = response.version) === null || _d === void 0 ? void 0 : _d.protocol) !== null && _e !== void 0 ? _e : response.protocol) !== null && _f !== void 0 ? _f : -1;
                    player_count = (_j = (_h = (_g = response.players) === null || _g === void 0 ? void 0 : _g.online) !== null && _h !== void 0 ? _h : response.playerCount) !== null && _j !== void 0 ? _j : -1;
                    player_max = (_m = (_l = (_k = response.players) === null || _k === void 0 ? void 0 : _k.max) !== null && _l !== void 0 ? _l : response.maxPlayers) !== null && _m !== void 0 ? _m : -1;
                    player_list = (_q = (_p = (_o = response.players) === null || _o === void 0 ? void 0 : _o.sample) !== null && _p !== void 0 ? _p : response.samplePlayers) !== null && _q !== void 0 ? _q : [];
                    description = "";
                    description += (_s = (_r = response.description) === null || _r === void 0 ? void 0 : _r.text) !== null && _s !== void 0 ? _s : "";
                    if ((_t = response.description) === null || _t === void 0 ? void 0 : _t.extra)
                        description +=
                            " " + response.description.extra.map(function (e) { return e.text; }).join("");
                    description += (_u = response.motd) !== null && _u !== void 0 ? _u : "";
                    if (description.length == 0)
                        description = "No server description";
                    _x.label = 12;
                case 12:
                    _x.trys.push([12, 14, , 15]);
                    console.log("".concat(version_name, ", ").concat(player_count, "/").concat(player_max, " players online, ").concat(description, ", ").concat(address));
                    return [4 /*yield*/, prisma.serverSnapshot.create({
                            data: {
                                ip: server.ip,
                                online: true,
                                version_name: version_name,
                                version_protocol: version_protocol,
                                player_count: player_count,
                                player_max: player_max,
                                description: description
                            }
                        })];
                case 13:
                    _x.sent();
                    return [3 /*break*/, 15];
                case 14:
                    e_2 = _x.sent();
                    console.log("Could not create server snapshot: ".concat(e_2.message));
                    return [3 /*break*/, 15];
                case 15:
                    _x.trys.push([15, 24, , 25]);
                    if (!player_list)
                        return [3 /*break*/, 1];
                    console.log("Players: ".concat(player_list.map(function (p) { return p.name; }).join(", ")));
                    _i = 0, player_list_1 = player_list;
                    _x.label = 16;
                case 16:
                    if (!(_i < player_list_1.length)) return [3 /*break*/, 23];
                    player = player_list_1[_i];
                    uuid = player.id;
                    username = player.name;
                    if (typeof uuid != "string" || typeof username != "string")
                        return [3 /*break*/, 22];
                    return [4 /*yield*/, prisma.player.upsert({
                            where: {
                                uuid: uuid
                            },
                            create: {
                                uuid: uuid,
                                username: username
                            },
                            update: {
                                username: username
                            }
                        })];
                case 17:
                    player_row = _x.sent();
                    _x.label = 18;
                case 18:
                    _x.trys.push([18, 20, , 21]);
                    return [4 /*yield*/, prisma.playerHistory.create({
                            data: {
                                player_id: player_row.id,
                                ip: server.ip
                            }
                        })];
                case 19:
                    _x.sent();
                    return [3 /*break*/, 21];
                case 20:
                    e_3 = _x.sent();
                    console.log("Error while adding player ".concat(player.name, " to database: ").concat(e_3.message));
                    return [3 /*break*/, 21];
                case 21:
                    console.log("Added player ".concat(player.name, " to database"));
                    _x.label = 22;
                case 22:
                    _i++;
                    return [3 /*break*/, 16];
                case 23: return [3 /*break*/, 25];
                case 24:
                    _v = _x.sent();
                    return [3 /*break*/, 25];
                case 25: return [3 /*break*/, 27];
                case 26:
                    _w = _x.sent();
                    return [3 /*break*/, 27];
                case 27: return [3 /*break*/, 1];
                case 28: return [2 /*return*/];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            // launch 10 scanners
            /*
            for (let i = 1; i <= 10; i++) {
              scanner(i);
              await sleep(4000); // stagger the scanners so they don't all start at the same time
            }
              */
            // one scanner for now :)
            scanner(69420);
            return [2 /*return*/];
        });
    });
}
main();
