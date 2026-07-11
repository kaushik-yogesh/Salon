import { ZodError } from 'zod';
import { ValidationError } from '../utils/errors.util.js';

export const validate = (schema) => {
  return (req, res, next) => {
    try {
      // Validate body, query, and params against the schema
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Map Zod errors to a simpler format for the client
        const issues = error.issues || error.errors || [];
        const formattedErrors = issues.map(err => ({
          path: err.path.join('.'),
          message: err.message
        }));
        
        return next(new ValidationError('Validation Error', formattedErrors));
      }
      next(error);
    }
  };
};
