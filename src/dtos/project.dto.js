import { z } from "zod";

const createProjectDto = z.object({
  name: z
    .string({
      required_error: "Project name is required",
      invalid_type_error: "Project name must be a string",
    })
    .trim()
    .min(2, "Project name must be at least 2 characters")
    .max(255, "Project name must be less than 255 characters"),

  description: z.string().trim().optional(),

  category: z
    .string({
      invalid_type_error: "Category must be a string",
    })
    .trim()
    .max(255, "Category must be less than 255 characters")
    .optional(),

  client_id: z.number().int().positive().nullable().optional(),

  template_id: z.number().int().positive().nullable().optional(),

  start_date: z.string().optional(),

  deadline: z.string().optional(),

  status: z
    .enum(["pending", "in_progress", "completed", "cancelled"])
    .optional(),

  priority: z.enum(["low", "medium", "high"]).optional(),
});

const updateProjectDto = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Project name must be at least 2 characters")
    .max(255, "Project name must be less than 255 characters")
    .optional(),

  description: z.string().trim().optional(),

  category: z
    .string()
    .trim()
    .max(255, "Category must be less than 255 characters")
    .optional(),

  client_id: z.number().int().positive().nullable().optional(),

  template_id: z.number().int().positive().nullable().optional(),

  start_date: z.string().optional(),

  deadline: z.string().optional(),

  status: z
    .enum(["pending", "in_progress", "completed", "cancelled"])
    .optional(),

  priority: z.enum(["low", "medium", "high"]).optional(),
});

export { createProjectDto, updateProjectDto };