export const errorHandler = (err, req, res, next) => {
  console.error(`[Error] [${req.method} ${req.originalUrl}]`, err.stack || err.message);

  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  let message = err.message || 'Unable to process request. Please try again later.';
  if (statusCode === 500 && isProduction) {
    message = 'Unable to analyze image. Please try again later.';
  }

  res.status(statusCode).json({
    success: false,
    message,
    data: null,
    errors: isProduction && statusCode === 500 ? [] : (err.errors || []),
    timestamp: new Date().toISOString()
  });
};
