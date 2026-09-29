import { AppError } from "@/lib/server/errors";
import { AiOutputError } from "./json";
import { AiProviderError } from "./provider";

/**
 * Turns whatever went wrong into something a learner can act on. Provider
 * messages, prompts and raw output are logged by code, never shown.
 */
export function toUserFacingAiError(error: unknown, savedNote: string): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof AiProviderError) {
    switch (error.code) {
      case "not_configured":
        return new AppError(503, "ai_not_configured", "AI features aren't set up on this server yet.");
      case "rate_limited":
      case "unavailable":
        return new AppError(503, "ai_unavailable", `The AI service is busy right now. ${savedNote} Try again in a minute.`);
      case "timeout":
        return new AppError(504, "ai_timeout", `The AI took too long to respond. ${savedNote} Try again.`);
      case "blocked":
        return new AppError(
          422,
          "ai_blocked",
          "The AI couldn't work with these details. Try rewording your goal or topics.",
        );
      default:
        return new AppError(502, "ai_invalid_output", `The AI returned an incomplete answer. ${savedNote} Try again.`);
    }
  }

  if (error instanceof AiOutputError) {
    return new AppError(502, "ai_invalid_output", `The AI returned an incomplete answer. ${savedNote} Try again.`);
  }

  return new AppError(500, "internal", `Something went wrong on our side. ${savedNote} Try again.`);
}

export function aiErrorCode(error: unknown) {
  if (error instanceof AiProviderError) return error.code;
  if (error instanceof AiOutputError) return "invalid_output";
  if (error instanceof AppError) return error.code;
  return "internal";
}
