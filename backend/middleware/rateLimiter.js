const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');
const logger = require('../utils/logger');

// Initialize Redis client
let redisClient;
try {
    redisClient = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        enableOfflineQueue: false
    });
} catch (error) {
    logger.warn('Redis connection failed, falling back to memory store:', error.message);
}

// Configure rate limiter
const limiter = rateLimit({
    store: redisClient ? new RedisStore({
        client: redisClient,
        prefix: 'rate-limit:',
        // Workaround for rate-limit-redis issue with ioredis
        sendCommand: (...args) => redisClient.call(...args)
    }) : undefined,
    windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // 15 minutes by default
    max: process.env.RATE_LIMIT_MAX || 100, // limit each IP to 100 requests per windowMs
    message: {
        status: 429,
        error: 'Too many requests, please try again later.',
        nextValidRequestDate: '', // Will be filled dynamically
    },
    handler: (req, res, next, options) => {
        const retryAfter = Math.ceil(options.windowMs / 1000);
        const nextValidDate = new Date(Date.now() + options.windowMs);
        
        options.message.nextValidRequestDate = nextValidDate.toISOString();
        
        res.status(options.statusCode).json(options.message);
        
        logger.warn('Rate limit exceeded:', {
            ip: req.ip,
            path: req.path,
            userAgent: req.get('User-Agent'),
            retryAfter
        });
    }
});

// Specific limiters for sensitive routes
const authLimiter = rateLimit({
    ...limiter,
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 attempts per hour
    message: {
        status: 429,
        error: 'Too many login attempts, please try again later.',
        nextValidRequestDate: ''
    }
});

const ipfsLimiter = rateLimit({
    ...limiter,
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // 10 uploads per 5 minutes
    message: {
        status: 429,
        error: 'Upload limit reached, please try again later.',
        nextValidRequestDate: ''
    }
});

module.exports = {
    limiter,
    authLimiter,
    ipfsLimiter
};
