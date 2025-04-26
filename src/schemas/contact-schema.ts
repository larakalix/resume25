import * as v from "valibot";

export const contactSchema = v.object({
    email: v.pipe(v.string(), v.email("Invalid email")),
    name: v.pipe(
        v.string(),
        v.minLength(3, "Name must be at least 3 characters long")
    ),
    message: v.pipe(
        v.string(),
        v.minLength(10, "Message must be at least 10 characters long")
    ),
    subject: v.pipe(
        v.string(),
        v.minLength(3, "Subject must be at least 3 characters long")
    ),
});

export type ContactForm = v.InferOutput<typeof contactSchema>;
