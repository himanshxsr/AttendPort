const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

module.exports = function(passport) {
  // Local Strategy
  passport.use(
    new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
      try {
        const user = await User.findOne({ email });
        if (!user) {
          return done(null, false, { message: 'That email is not registered' });
        }

        const isMatch = await user.comparePassword(password);
        if (isMatch) {
          if (user.isDeleted === true) {
            return done(null, false, { message: 'Your account has been deleted. Please contact your admin.' });
          }
          return done(null, user);
        } else {
          return done(null, false, { message: 'Password incorrect' });
        }
      } catch (err) {
        return done(err);
      }
    })
  );

  // Google Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/api/auth/google/callback',
        proxy: true,
      },
      async (accessToken, refreshToken, profile, done) => {
        const email = profile.emails[0].value;

        try {
          // Check if user exists by email FIRST (for pre-registered users)
          let user = await User.findOne({ email });

          if (user) {
            if (user.isDeleted === true) {
              return done(null, false, { message: 'Your account has been deleted. Please contact your admin.' });
            }
            // If user exists, update their Google ID and Avatar if not present
            user.googleId = profile.id;
            user.avatar = profile.photos[0].value;
            await user.save();
            return done(null, user);
          } else {
            // IF NO USER EXISTS WITH THIS EMAIL, REJECT SIGN-IN
            return done(null, false, { message: 'This email is not authorized to sign in. Please contact your admin.' });
          }
        } catch (err) {
          console.error(err);
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
};
