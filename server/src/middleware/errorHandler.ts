
import type {
  ErrorRequestHandler,
  RequestHandler,
} from "express";

export const notFoundHandler: RequestHandler = (
  _req,
  res
) => {
  res.status(404).json({
    error: "API endpoint not found.",
  });
};

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  _next
) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "type" in error
  ) {
    if (error.type === "entity.too.large") {
      res.status(413).json({
        error: "Request body is too large.",
      });
      return;
    }

    if (error.type === "entity.parse.failed") {
      res.status(400).json({
        error: "Malformed JSON request body.",
      });
      return;
    }
  }

  console.error("[API Error]", error);

  res.status(500).json({
    error: "An internal server error occurred.",
  });
};
