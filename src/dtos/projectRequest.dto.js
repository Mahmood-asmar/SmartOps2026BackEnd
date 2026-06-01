import { z } from "zod";

const isTodayOrFutureDate = (value) => {
  const selectedDate = new Date(value);
  const today = new Date();

  if (Number.isNaN(selectedDate.getTime())) {
    return false;
  }

  today.setHours(0, 0, 0, 0);
  selectedDate.setHours(0, 0, 0, 0);

  return selectedDate >= today;
};

const createProjectRequestDto = z.object({
  project_name: z
    .string({
      required_error: "Project name is required",
      invalid_type_error: "Project name must be a string",
    })
    .trim()
    .min(2, "Project name must be at least 2 characters")
    .max(255, "Project name must be less than 255 characters"),

  description: z
    .string({
      required_error: "Description is required",
      invalid_type_error: "Description must be a string",
    })
    .trim()
    .min(2, "Description must be at least 2 characters"),

  category: z
    .string({
      required_error: "Category is required",
      invalid_type_error: "Category must be a string",
    })
    .trim()
    .min(1, "Category is required")
    .max(255, "Category must be less than 255 characters"),

  deadline: z
    .string({
      required_error: "Deadline is required",
      invalid_type_error: "Deadline must be a string",
    })
    .trim()
    .min(1, "Deadline is required")
    .refine(isTodayOrFutureDate, {
      message: "Deadline cannot be in the past",
    }),

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