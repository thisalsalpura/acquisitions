import express from 'express';
import helmet from "helmet";
import morgan from 'morgan';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import logger from '#config/logger.js';
import authRoutes from '#routes/auth.routes.js';
import usersRoutes from '#routes/users.routes.js';
import securityMiddleware from '#middleware/security.middleware.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(securityMiddleware);

app.get('/', (req, res) => {
    logger.info('Request Received!');
    res.status(200).send('Hello World!');
});

app.get('/health', (req, res) => {
    res.status(200).send({ status: 'OK', time: new Date().toISOString(), uptime: process.uptime() });
});

app.get('/api', (req, res) => {
    res.status(200).send({ message: 'API is Working!' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);

export default app;
