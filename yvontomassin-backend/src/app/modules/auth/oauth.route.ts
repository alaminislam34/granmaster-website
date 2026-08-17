import { Router, Request, Response } from 'express';
import passport from '../../config/passport.config';
import config from '../../config';
import { generateTokens } from '../../config/oauth-utils';

const oauthRouter = Router();

oauthRouter.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

oauthRouter.get(
  '/google/callback',
  (req: Request, res: Response, next) => {
    passport.authenticate('google', { session: false }, (err, user) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'OAuth error',
        });
      }

      if (!user?._id) {
        return res.status(401).json({
          success: false,
          message: 'Login failed',
        });
      }

      const { accessToken, refreshToken } = generateTokens(
        user._id.toString()
      );

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          accessToken,
          refreshToken,
          redirectUrl: config.frontend.url,
        },
      });
    })(req, res, next);
  }
);

export default oauthRouter;
