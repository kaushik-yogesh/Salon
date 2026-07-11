export const sendSuccess = (res, data, statusCode = 200, meta = null) => {
  const response = {
    success: true,
    data
  };
  
  if (meta) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

export const sendError = (res, error, statusCode = 500) => {
  const response = {
    success: false,
    error: {
      message: error.message || 'Internal Server Error'
    }
  };

  // Attach validation errors if present (e.g. from Zod)
  if (error.errors) {
    response.error.details = error.errors;
  }

  // Optionally include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.error.stack = error.stack;
  }

  return res.status(statusCode).json(response);
};
