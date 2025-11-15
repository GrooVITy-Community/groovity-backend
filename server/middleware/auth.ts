import { Request, Response, NextFunction } from 'express';

export function adminAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers['x-admin-token'];
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret) {
    return res.status(500).json({ 
      message: 'Admin authentication not configured' 
    });
  }

  if (!token || token !== adminSecret) {
    return res.status(401).json({ 
      message: 'Unauthorized: Invalid or missing admin token' 
    });
  }

  next();
}
