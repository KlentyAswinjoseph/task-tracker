import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '@shared/types';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);

  const response: ApiResponse = {
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
  };

  res.status(500).json(response);
}; 