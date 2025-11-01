"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIModule = void 0;
const common_1 = require("@nestjs/common");
const task_plan_controller_1 = require("./task-plan.controller");
const task_plan_service_1 = require("./task-plan.service");
const prisma_module_1 = require("../../prisma/prisma.module");
const calendar_module_1 = require("../calendar/calendar.module");
let AIModule = class AIModule {
};
exports.AIModule = AIModule;
exports.AIModule = AIModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, calendar_module_1.CalendarModule],
        controllers: [task_plan_controller_1.TaskPlanController],
        providers: [task_plan_service_1.TaskPlanService],
        exports: [task_plan_service_1.TaskPlanService],
    })
], AIModule);
//# sourceMappingURL=ai.module.js.map