const jwt = require('jsonwebtoken');
const User = require('../models/User');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
      if (userExists.isDeleted) {
        // Restore/Update the deleted user
        userExists.isDeleted = false;
        userExists.name = name;
        userExists.password = password;
        userExists.deletedBy = undefined;
        userExists.deletedAt = undefined;
        await userExists.save();
        return res.status(200).json({
          _id: userExists._id,
          name: userExists.name,
          email: userExists.email,
          role: userExists.role,
          token: generateToken(userExists._id),
        });
      }
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.comparePassword(password))) {
      if (user.isDeleted === true) {
        return res.status(401).json({ message: 'Your account has been deleted. Please contact your admin.' });
      }
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      if (user.isDeleted === true) {
        return res.status(401).json({ message: 'Your account has been deleted' });
      }
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    next(error);
  }
};

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};
