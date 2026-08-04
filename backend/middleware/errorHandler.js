module.exports = (err, req, res, next) => {
  console.error('[Server Safe Intercept]:', err.message);
  return res.status(500).json({
    success: false,
    message: 'An internal server error occurred, but the machine stayed active.'
  });
};