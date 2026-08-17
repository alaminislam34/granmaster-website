import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import config from '.';
import { findOrCreateUser } from './oauth-utils';

// Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: config.oauth.google.clientId,
      clientSecret: config.oauth.google.clientSecret,
      callbackURL: config.oauth.google.callbackUrl,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await findOrCreateUser(
          {
            id: profile.id,
            email: profile.emails?.[0]?.value,
            given_name: profile.name?.givenName,
            family_name: profile.name?.familyName,
            picture: profile.photos?.[0]?.value,
          },
          'google'
        );
        done(null, user);
      } catch (error) {
        done(error as Error, false);
      }
    }
  )
);

// Apple Strategy
// passport.use(
//   new AppleStrategy(
//     {
//       clientID: config.oauth.apple.clientId,
//       teamID: config.oauth.apple.teamId,
//       keyID: config.oauth.apple.keyId,
//       privateKey: config.oauth.apple.privateKey,
//       callbackURL: config.oauth.apple.callbackUrl,
//     },
//     async (accessToken, refreshToken, idToken, user, done) => {
//       try {
//         const foundUser = await findOrCreateUser(
//           {
//             id: user.id,
//             email: user.email,
//             firstName: user.name?.firstName,
//             lastName: user.name?.lastName,
//           },
//           'apple'
//         );
//         done(null, foundUser);
//       } catch (error) {
//         done(error, null);
//       }
//     }
//   )
// );

// Serialize user
passport.serializeUser((user: any, done) => {
  done(null, user._id);
});

// Deserialize user
passport.deserializeUser(async (id: string, done) => {
  try {
    const User = require('../modules/user/user.model').User;
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error as Error, false);
  }
});

export default passport;
