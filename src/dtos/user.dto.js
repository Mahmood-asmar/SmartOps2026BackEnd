import { z } from "zod";

const createUserDto = z.object({
  name: z
    .string({
      required_error: "Name is required",
      invalid_type_error: "Name must be a string",
    })
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),

  email: z
    .string({
      required_error: "Email is required",
      invalid_type_error: "Email must be a string",
    })
    .trim()
    .email("Please enter a valid email address"),

  password: z
    .string({
      required_error: "Password is required",
      invalid_type_error: "Password must be a string",
    })
    .min(6, "Password must be at least 6 characters"),

  role: z.enum(["admin", "employee", "client"], {
    required_error: "Role is required",
    invalid_type_error: "Role must be admin, employee, or client",
  }),
});

const updateUserDto = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .optional(),

  email: z.string().trim().email("Please enter a valid email address").optional(),

  password: z.string().min(6, "Password must be at least 6 characters").optional(),

  role: z.enum(["admin", "employee", "client"]).optional(),
});

export { createUserDto, updateUserDto };