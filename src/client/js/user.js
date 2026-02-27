"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
var desk_1 = require("../desk");
require("../css/main.scss");
require("bootstrap");
document.addEventListener('DOMContentLoaded', function () { return __awaiter(void 0, void 0, void 0, function () {
    var targetUserIdEl, userId, response, data, error_1, userNameEl, weightHistoryEl;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                targetUserIdEl = document.getElementById('target-user-id');
                userId = targetUserIdEl === null || targetUserIdEl === void 0 ? void 0 : targetUserIdEl.value;
                if (!userId)
                    return [2 /*return*/];
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                return [4 /*yield*/, fetch("/api/user-data/".concat(userId))];
            case 2:
                response = _a.sent();
                if (!response.ok) {
                    // throw new Error('Ошибка при загрузке данных');
                }
                return [4 /*yield*/, response.json()];
            case 3:
                data = _a.sent();
                renderUserData(data);
                return [3 /*break*/, 5];
            case 4:
                error_1 = _a.sent();
                console.error('Error:', error_1);
                userNameEl = document.getElementById('user-name');
                if (userNameEl)
                    userNameEl.textContent = 'Ошибка загрузки';
                weightHistoryEl = document.getElementById('weight-history');
                if (weightHistoryEl)
                    weightHistoryEl.innerHTML = "<tr><td colspan=\"3\" class=\"text-center text-danger\">".concat(error_1.message, "</td></tr>");
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
function renderUserData(data) {
    var user = data.user, weightLogs = data.weightLogs;
    var userNameEl = document.getElementById('user-name');
    if (userNameEl)
        userNameEl.textContent = user.name || 'Пользователь';
    if (weightLogs.length === 0)
        return;
    var dest = new desk_1.Desk();
    dest.init(weightLogs);
}
