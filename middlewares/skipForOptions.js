export const skipForOptions = (middleware) => (req, res, next) => {
  if (req.method === "OPTIONS") return next();
  return middleware(req, res, next);
};
