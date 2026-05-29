import { z } from "zod";

const createTaskDto = z.object({
  title: z
    .string({
      required_error: "Task title is required",
      invalid_type_error: "Task title must be a string",
    })
    .trim()
    .min(2, "Task title must be at least 2 characters")
    .max(255, "Task title must be less than 255 characters"),

  description: z.string().trim().optional(),

  assigned_user: z
    .number({
      required_error: "Assigned user is required",
      invalid_type_error: "Assigned user must be a number",
    })
    .int()
    .positive(),

  deadline: z.string().optional(),

  priority: z.enum(["low", "medium", "high"]).optional(),

  status: z.enum(["pending", "in_progress", "completed"]).optional(),

  project_id: z
    .number({
      required_error: "Project ID is required",
      invalid_type_error: "Project ID must be a number",
    })
    .int()
    .positive(),
});

const updateTaskDto = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Task title must be at least 2 characters")
    .max(255, "Task title must be less than 255 characters")
    .optional(),

  description: z.string().trim().optional(),

  assigned_user: z.number().int().positive().optional(),

  deadline: z.string().optional(),

  priority: z.enum(["low", "medium", "high"]).optional(),

  status: z.enum(["pending", "in_progress", "completed"]).optional(),

  project_id: z.number().int().positive().optional(),
});

const updateTaskStatusDto = z.object({
  status: z.enum(["pending", "in_progress", "completed"], {
    required_error: "Status is required",
    invalid_type_error: "Status must be pending, in_progress, or completed",
  }),
});

export { createTaskDto, updateTaskDto, updateTaskStatusDto };