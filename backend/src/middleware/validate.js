import { validationResult } from 'express-validator';

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      data: null,
      errors: errors.array(),
      timestamp: new Date().toISOString()
    });
  }
  next();
};
