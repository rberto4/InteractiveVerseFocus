"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskPlanController = void 0;
const common_1 = require("@nestjs/common");
const task_plan_service_1 = require("./task-plan.service");
const jwt_auth_guard_1 = require("../../auth/jwt-auth.guard");
const current_user_decorator_1 = require("../../auth/current-user.decorator");
const calendar_service_1 = require("../calendar/calendar.service");
let TaskPlanController = class TaskPlanController {
    taskPlanService;
    calendarService;
    constructor(taskPlanService, calendarService) {
        this.taskPlanService = taskPlanService;
        this.calendarService = calendarService;
    }
    async generateTaskPlan(user, goalId) {
        return this.taskPlanService.generateTaskPlan(user.userId, goalId);
    }
    async getTaskPlan(user, goalId) {
        return this.taskPlanService.getTaskPlan(user.userId, goalId);
    }
    async updateStatus(user, planId, body) {
        return this.taskPlanService.updateTaskPlanStatus(user.userId, planId, body.status);
    }
    async scheduleToCalendar(user, planId) {
        return this.taskPlanService.scheduleTasksToCalendar(user.userId, planId);
    }
    async deleteTask(user, planId, taskIndex) {
        const taskIndexNum = parseInt(taskIndex, 10);
        const taskPlan = await this.taskPlanService.getTaskPlanById(user.userId, planId);
        if (!taskPlan || !taskPlan.calendarEvents) {
            throw new Error('Task plan not found or has no calendar events');
        }
        const eventId = taskPlan.calendarEvents[taskIndexNum];
        if (!eventId) {
            throw new Error('Calendar event not found for this task');
        }
        await this.calendarService.deleteEvent(user.userId, eventId);
        await this.taskPlanService.removeCalendarEventFromPlan(user.userId, planId, taskIndexNum);
        return {
            success: true,
            message: 'Task and calendar event deleted successfully',
        };
    }
    async deleteAllEvents(user, planId) {
        const taskPlan = await this.taskPlanService.getTaskPlanById(user.userId, planId);
        if (!taskPlan) {
            throw new Error('Task plan not found');
        }
        const calendarEventsObj = taskPlan.calendarEvents || {};
        const eventIds = Object.values(calendarEventsObj).filter(id => id);
        for (const eventId of eventIds) {
            try {
                await this.calendarService.deleteEvent(user.userId, eventId);
            }
            catch (error) {
                console.error(`Failed to delete event ${eventId}:`, error);
            }
        }
        await this.taskPlanService.clearCalendarEvents(user.userId, planId);
        return {
            success: true,
            message: `Deleted ${eventIds.length} calendar events`,
            count: eventIds.length,
        };
    }
    async regenerateTaskPlan(user, goalId) {
        const existingPlan = await this.taskPlanService.getTaskPlan(user.userId, goalId);
        let deletedEventsCount = 0;
        if (existingPlan) {
            const calendarEventsObj = existingPlan.calendarEvents || {};
            const eventIds = Object.values(calendarEventsObj).filter(id => id);
            for (const eventId of eventIds) {
                try {
                    await this.calendarService.deleteEvent(user.userId, eventId);
                    deletedEventsCount++;
                }
                catch (error) {
                    console.error(`Failed to delete event ${eventId}:`, error);
                }
            }
            await this.taskPlanService.deleteTaskPlan(user.userId, existingPlan.id);
        }
        const newPlan = await this.taskPlanService.generateTaskPlan(user.userId, goalId);
        return {
            ...newPlan,
            regenerated: true,
            deletedEventsCount,
        };
    }
};
exports.TaskPlanController = TaskPlanController;
__decorate([
    (0, common_1.Post)('generate/:goalId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('goalId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TaskPlanController.prototype, "generateTaskPlan", null);
__decorate([
    (0, common_1.Get)('goal/:goalId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('goalId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TaskPlanController.prototype, "getTaskPlan", null);
__decorate([
    (0, common_1.Put)(':planId/status'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('planId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], TaskPlanController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Post)(':planId/schedule'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('planId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TaskPlanController.prototype, "scheduleToCalendar", null);
__decorate([
    (0, common_1.Delete)(':planId/task/:taskIndex'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('planId')),
    __param(2, (0, common_1.Param)('taskIndex')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], TaskPlanController.prototype, "deleteTask", null);
__decorate([
    (0, common_1.Delete)(':planId/events'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('planId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TaskPlanController.prototype, "deleteAllEvents", null);
__decorate([
    (0, common_1.Post)('regenerate/:goalId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('goalId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TaskPlanController.prototype, "regenerateTaskPlan", null);
exports.TaskPlanController = TaskPlanController = __decorate([
    (0, common_1.Controller)('task-plans'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [task_plan_service_1.TaskPlanService,
        calendar_service_1.CalendarService])
], TaskPlanController);
//# sourceMappingURL=task-plan.controller.js.map