const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

function startCleanupCron() {
    // تنظيف مجلدات الـ tmp يومياً الساعة 4 صباحاً
    cron.schedule('0 4 * * *', () => {
        logger.info('[Asta Cleanup] 🧹 حان وقت تنظيف النفايات السحرية لجعل السيرفر أسرع!');

        // المجلدات المستهدفة للتنظيف
        const targetDirs = [
            path.join(__dirname, '../../tmp'),
            path.join(__dirname, '../../media_store')
        ];

        const now = Date.now();
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

        targetDirs.forEach((dir) => {
            if (!fs.existsSync(dir)) return;

            fs.readdir(dir, (err, files) => {
                if (err) {
                    logger.error(`[Asta Cleanup] فشل قراءة المجلد ${dir}: ${err.message}`);
                    return;
                }

                files.forEach((file) => {
                    const filePath = path.join(dir, file);
                    fs.stat(filePath, (err, stats) => {
                        if (err) return;

                        if (stats.isFile() && (now - stats.mtimeMs > TWENTY_FOUR_HOURS)) {
                            fs.unlink(filePath, (err) => {
                                if (err) logger.error(`[Asta Cleanup] فشل حذف ${filePath}`);
                            });
                        }
                    });
                });
            });
        });
    });
}

module.exports = startCleanupCron;
