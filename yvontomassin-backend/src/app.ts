import express, { Application, Request, Response } from 'express';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import multer from 'multer';
import passport from './app/config/passport.config';
import config from './app/config';
import router from './routes';
import notFound from './middlewares/NotFound';
import globalErrorHandler from './middlewares/NotFound';

// express
const app: Application = express();
const allowedOrigins = Array.from(
  new Set(
    [
      config.frontend.url,
      process.env.CORS_ORIGINS,
      'http://52.54.77.164:3000',
      'http://13.49.178.252:3000',
      'http://16.16.199.132:3000',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:33097',
    ]
      .flatMap((origin) => origin?.split(',') ?? [])
      .map((origin) => origin.trim())
      .filter(Boolean)
  )
);
const allowAllCorsOrigins = process.env.CORS_ALLOW_ALL === 'true';

// parsers
app.use(express.json());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowAllCorsOrigins || allowedOrigins.includes(origin)) {
        callback(null, origin || true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
  })
);
app.use(cookieParser());

// Session middleware for OAuth
app.use(
  session({
    secret: process.env.JWT_ACCESS_SECRET || 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, httpOnly: true },
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Serve uploaded files — allow cross-origin image loading
app.use('/uploads', (_req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.removeHeader('Access-Control-Allow-Credentials');
  next();
}, express.static(path.join(process.cwd(), 'uploads')));

app.use('/api', router);

app.get('/healthcheck', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (_req: Request, res: Response) => {
  res.send('yvontomassin backend Task World!');
});

// Handle Multer errors with a clean JSON response
app.use((err: any, _req: Request, res: Response, next: any) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: err.message,
      errorSources: [
        {
          path: err.field ?? '',
          message: `Multer error on field "${err.field}": ${err.message}. Make sure the field name is correct.`,
        },
      ],
    });
  }
  next(err);
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
