import { signup } from '#controllers/auth.controller.js';
import express from 'express';

const router = express.Router();

router.post('/signup', signup);

router.post('/signin', (req, res) => {
    res.send('POST /api/auth/signin response');
});

router.post('/signout', (req, res) => {
    res.send('POST /api/auth/signout response');
});

export default router;