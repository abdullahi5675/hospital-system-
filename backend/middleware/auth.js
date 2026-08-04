exports.requireLogin = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Please log in.' });
  }
  next();
};

exports.requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.session.user || !roles.includes(req.session.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden. Access denied.' });
    }
    next();
  };
};
