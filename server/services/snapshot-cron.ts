import { CronJob } from 'cron';
import { createSnapshotsForAllUsers } from './net-worth-snapshot';
import { logger } from '@shared/logger';

export function startSnapshotCronService(): void {
  const job = new CronJob(
    '0 0 * * *',
    async () => {
      logger.info('[Snapshot Cron] Starting daily snapshots');
      try {
        const result = await createSnapshotsForAllUsers();
        logger.info('[Snapshot Cron] Daily snapshots complete', {
          metadata: { success: result.success, failed: result.failed }
        });
      } catch (error: any) {
        logger.error('[Snapshot Cron] Daily snapshot job failed', {
          metadata: { error: error.message }
        });
      }
    },
    null,
    false,
    'America/New_York'
  );
  
  job.start();
  logger.info('[Snapshot Cron] Service started - running daily at midnight ET');
}
