import { z } from "zod";

const createProjectTemplateDto = z.object({
  name: z
    .string({
      required_error: "Template name is required",
      invalid_type_error: "Template name must be a string",
    })
    .trim()
    .min(2, "Template name must be at least 2 characters")
    .max(255, "Template name must be less than 255 characters"),

  description: z
    .string({
      invalid_type_error: "Description must be a string",
    })
    .trim()
    .optional(),

  category: z
    .string({
      invalid_type_error: "Category must be a string",
    })
    .trim()
    .max(255, "Category must be less than 255 characters")
    .optional(),

  estimated_duration: z
    .number({
      invalid_type_error: "Estimated duration must be a number",
    })
    .int("Estimated duration must be an integer")
    .positive("Estimated duration must be greater than 0")
    .optional(),
});

const updateProjectTemplateDto = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Template name must be at least 2 characters")
    .max(255, "Template name must be less than 255 characters")
    .optional(),

  description: z.string().trim().optional(),

  category: z
    .string()
    .trim()
    .max(255, "Category must be less than 255 characters")
    .optional(),

  estimated_duration: z
    .number({
      invalid_type_error: "Estimated duration must be a number",
    })
    .int("Estimated duration must be an integer")
    .positive("Estimated duration must be greater than 0")
    .optional(),
});

export { createProjectTemplateDto, updateProjectTemplateDto };