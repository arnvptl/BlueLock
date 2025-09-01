const logger = require('./logger');

class Monitor {
    static _instance = null;
    
    constructor() {
        this.errors = new Map();
        this.errorThreshold = 10;
        this.timeWindow = 5 * 60 * 1000; // 5 minutes
    }

    static getInstance() {
        if (!Monitor._instance) {
            Monitor._instance = new Monitor();
        }
        return Monitor._instance;
    }

    trackError(error) {
        const errorKey = `${error.name}:${error.message}`;
        const now = Date.now();
        
        if (!this.errors.has(errorKey)) {
            this.errors.set(errorKey, []);
        }
        
        const errorList = this.errors.get(errorKey);
        errorList.push(now);
        
        // Remove old errors outside the time window
        const cutoff = now - this.timeWindow;
        while (errorList.length > 0 && errorList[0] < cutoff) {
            errorList.shift();
        }
        
        // Check if error threshold is exceeded
        if (errorList.length >= this.errorThreshold) {
            logger.error(`Error threshold exceeded for: ${errorKey}`, {
                occurrences: errorList.length,
                timeWindow: this.timeWindow / 1000 / 60 + ' minutes'
            });
        }
    }

    getErrorStats() {
        const stats = {};
        const now = Date.now();
        
        this.errors.forEach((timestamps, errorKey) => {
            // Only count errors within the time window
            const recentErrors = timestamps.filter(t => t > now - this.timeWindow);
            if (recentErrors.length > 0) {
                stats[errorKey] = recentErrors.length;
            }
        });
        
        return stats;
    }
}

module.exports = Monitor.getInstance();
