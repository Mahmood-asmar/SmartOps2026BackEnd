const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateRegister = (req, res, next) => {
  const { name, email, password } = req.body;

  if (!name && !email && !password) {
    return res.status(400).json({
      message: "Name, email, and password are required",
    });
  }

  if (!name) {
    return res.status(400).json({
      message: "Name is required",
    });
  }

  if (name.trim().length === 0) {
    return res.status(400).json({
      message: "Name cannot be empty",
    });
  }

  if (!email) {
    return res.status(400).json({
      message: "Email is required",
    });
  }

  if (!isValidEmail(email.trim())) {
    return res.status(400).json({
      message: "Please enter a valid email address",
    });
  }

  if (!password) {
    return res.status(400).json({
      message: "Password is required",
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      message: "Password must be at least 6 characters",
    });
  }

  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email && !password) {
    return res.status(400).json({
      message: "Email and password are required",
    });
  }

  if (!email) {
    return res.status(400).json({
      message: "Email is required",
    });
  }

  if (!isValidEmail(email.trim())) {
    return res.status(400).json({
      message: "Please enter a valid email address",
    });
  }

  if (!password) {
    return res.status(400).json({
      message: "Password is required",
    });
  }

  next();
};

const validateForgotPassword = (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      message: "Email is required",
    });
  }

  if (!isValidEmail(email.trim())) {
    return res.status(400).json({
      message: "Please enter a valid email address",
    });
  }

  next();
};

const validateVerifyOtp = (req, res, next) => {
  const { email, otp } = req.body;

  if (!email && !otp) {
    return res.status(400).json({
      message: "Email and OTP are required",
    });
  }

  if (!email) {
    return res.status(400).json({
      message: "Email is required",
    });
  }

  if (!isValidEmail(email.trim())) {
    return res.status(400).json({
      message: "Please enter a valid email address",
    });
  }

  if (!otp) {
    return res.status(400).json({
      message: "OTP is required",
    });
  }

  if (!/^\d{6}$/.test(otp)) {
    return res.status(400).json({
      message: "OTP must be 6 digits",
    });
  }

  next();
};

const validateResetPassword = (req, res, next) => {
  const { email, newPassword } = req.body;

  if (!email && !newPassword) {
    return res.status(400).json({
      message: "Email and new password are required",
    });
  }

  if (!email) {
    return res.status(400).json({
      message: "Email is required",
    });
  }

  if (!isValidEmail(email.trim())) {
    return res.status(400).json({
      message: "Please enter a valid email address",
    });
  }

  if (!newPassword) {
    return res.status(400).json({
      message: "New password is required",
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      message: "New password must be at least 6 characters",
    });
  }

  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateVerifyOtp,
  validateResetPassword,
};