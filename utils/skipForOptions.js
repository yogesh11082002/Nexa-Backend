// utils/skipForOptions.js
export const skipForOptions = (middleware) => (req, res, next) => {
  if (req.method === "OPTIONS") return next(); // skip for preflight
  return middleware(req, res, next);
};
