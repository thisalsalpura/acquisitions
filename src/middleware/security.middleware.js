import aj from "#config/arcjet.js";
import logger from "#config/logger.js";
import { slidingWindow } from "@arcjet/node";

const securityMiddleware = async (req, res, next) => {
    try {
        const role = req.user?.user || 'guest';

        let limit;
        let message;

        switch (role) {
            case 'admin':
                limit = 20
                message = 'Admin request limit exceeded (20 per minute). Slow Down!'
                break;

            case 'user':
                limit = 10
                message = 'User request limit exceeded (10 per minute). Slow Down!'
                break;

            case 'guest':
                limit = 5
                message = 'Guest request limit exceeded (5 per minute). Slow Down!'
                break;
        }

        const client = aj.withRule(slidingWindow({ mode: 'LIVE', interval: '1m', max: limit, name: `${role}-rate-limit` }));

        const decition = await client.protect(req);

        if (decition.isDenied() && decition.reason.isBot()) {
            logger.warn('Bot request Blocked', { ip: req.ip, userAgent: req.get('User-Agent'), path: req.path });
            return res.status(403).json({ error: 'Forbidden', message: 'Automated requests are not Allowed!' });
        } else if (decition.isDenied() && decition.reason.isShield()) {
            logger.warn('Shield blocked Request', { ip: req.ip, userAgent: req.get('User-Agent'), path: req.path, method: req.method });
            return res.status(403).json({ error: 'Forbidden', message: 'Request blocked by security Policy!' });
        } else if (decition.isDenied() && decition.reason.isRateLimit()) {
            logger.warn('Rate limit Exceeded', { ip: req.ip, userAgent: req.get('User-Agent'), path: req.path });
            return res.status(403).json({ error: 'Forbidden', message: 'Too many Request!' });
        }

        next();
    } catch (error) {
        logger.error('Arcjet middleware Error:', error);
        res.status(500).json({ error: 'Internal server Error!', message: 'Something went wrong with security Middleware.' });
    }
}

export default securityMiddleware;