import { z } from "zod";

const createProjectRequestDto = z.object({
  project_name: z
    .string({
      required_error: "Project name is required",
      invalid_type_error: "Project name must be a string",
    })
    .trim()
    .min(2, "Project name must be at least 2 characters")
    .max(255, "Project name must be less than 255 characters"),

  description: z.string().trim().optional(),

  deadline: z.string().optional(),

  template_id: z.number().int().positive().nullable().optional(),
});

const rejectProjectRequestDto = z.object({
  rejection_reason: z
    .string({
      required_error: "Rejection reason is required",
      invalid_type_error: "Rejection reason must be a string",
    })
    .trim()
    .min(2, "Rejection reason must be at least 2 characters"),
});

export { createProjectRequestDto, rejectProjectRequestDto };