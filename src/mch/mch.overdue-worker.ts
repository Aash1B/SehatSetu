import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MchReminderType, ReminderStatus, VaccinationStatus } from '@prisma/client';
import { prisma } from '../prisma';

/**
 * MCH Overdue Reminder Worker
 *
 * Runs on a configurable interval (default: daily) and discovers:
 *   - Vaccination records that are past their scheduled date and not completed/missed
 *   - ANC next-visit dates that are past and not yet attended
 *
 * For each overdue event it creates a MchReminder(OVERDUE) — using the existing
 * unique constraint on (vaccinationRecordId, reminderType) and
 * (ancVisitId, reminderType) to guarantee idempotency — then enqueues it on the
 * existing mch-queue so MchProcessor delivers the email.
 *
 * Safe to run repeatedly: duplicate DB rows are silently skipped via the unique
 * constraint catch, and duplicate emails are blocked by the MchProcessor's
 * status === SENT check.
 */
@Injectable()
export class MchOverdueWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MchOverdueWorker.name);
  private timer?: ReturnType<typeof setInterval>;

  /** Interval in ms. Default 24 h. Override via MCH_OVERDUE_INTERVAL_MS env var. */
  private get intervalMs(): number {
    const env = Number(process.env.MCH_OVERDUE_INTERVAL_MS);
    return Number.isFinite(env) && env > 0 ? env : 24 * 60 * 60 * 1000;
  }

  /** Batch page size for DB queries — keeps memory bounded. */
  private readonly BATCH_SIZE = 200;

  constructor(
    @InjectQueue('mch-queue') private readonly mchQueue: Queue,
  ) {}

  onModuleInit() {
    // Run once immediately on startup (catches anything that went overdue while the
    // server was down), then on the configured interval.
    void this.runOverdueScan().catch((err) =>
      this.logger.error('Initial MCH overdue scan failed', err),
    );
    this.timer = setInterval(
      () => void this.runOverdueScan().catch((err) =>
        this.logger.error('Scheduled MCH overdue scan failed', err),
      ),
      this.intervalMs,
    );
    // Do not block process exit on this timer.
    this.timer.unref?.();
    this.logger.log(
      `MCH overdue worker started — interval ${Math.round(this.intervalMs / 60_000)} min`,
    );
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /**
   * Public for tests: scan for overdue vaccinations and ANC visits,
   * create reminders, and enqueue them.
   * Returns counts of reminders created.
   */
  async runOverdueScan(): Promise<{ vaccinations: number; anc: number }> {
    const now = new Date();
    this.logger.log('MCH overdue scan started');

    const [vaccCount, ancCount] = await Promise.all([
      this.processOverdueVaccinations(now),
      this.processOverdueAncVisits(now),
    ]);

    this.logger.log(
      `MCH overdue scan complete — vaccinations: ${vaccCount}, ANC: ${ancCount}`,
    );
    return { vaccinations: vaccCount, anc: ancCount };
  }

  // ─── Overdue vaccinations ──────────────────────────────────────────────────

  private async processOverdueVaccinations(now: Date): Promise<number> {
    // Find vaccination records that are past their scheduled date and not resolved.
    // COMPLETED and MISSED are both terminal — we don't chase them.
    const records = await prisma.vaccinationRecord.findMany({
      where: {
        scheduledDate: { lt: now },
        status: { in: [VaccinationStatus.UPCOMING, VaccinationStatus.DUE] },
      },
      include: {
        child: { select: { id: true, patientId: true } },
      },
      take: this.BATCH_SIZE,
      orderBy: { scheduledDate: 'asc' },
    });

    let created = 0;
    for (const record of records) {
      const patientId = record.child?.patientId;
      if (!patientId) continue;

      try {
        // Idempotent create — unique constraint on (vaccinationRecordId, reminderType)
        // will throw P2002 if the reminder already exists; we catch and skip.
        const reminder = await prisma.mchReminder.create({
          data: {
            patientId,
            childId: record.childId,
            vaccinationRecordId: record.id,
            reminderType: MchReminderType.VACCINATION_OVERDUE,
            eventDate: record.scheduledDate,
            status: ReminderStatus.PENDING,
          },
        });

        // Enqueue immediately (delay = 0 → process as soon as a worker is free).
        await this.mchQueue.add(
          'send-mch-reminder',
          {
            reminderId: reminder.id,
            type: MchReminderType.VACCINATION_OVERDUE,
            patientId,
            childId: record.childId,
          },
          // jobId prevents the same reminder being queued twice if the worker
          // restarts before the job is dequeued.
          { jobId: `mch-overdue-${reminder.id}` },
        );

        created++;
      } catch (err: any) {
        // P2002 = unique constraint violation — reminder already exists.
        if (err?.code === 'P2002') {
          this.logger.debug(
            `Overdue vaccination reminder already exists for record ${record.id} — skipping`,
          );
        } else {
          this.logger.error(
            `Failed to create overdue vaccination reminder for record ${record.id}`,
            err,
          );
        }
      }
    }

    return created;
  }

  // ─── Overdue ANC visits ────────────────────────────────────────────────────

  private async processOverdueAncVisits(now: Date): Promise<number> {
    // An ANC visit is considered to have a "next visit" scheduled when
    // nextVisitDate is set. If that date is in the past we consider it overdue.
    //
    // We avoid chasing visits from already-completed or terminated pregnancies
    // by filtering on the parent pregnancy status.
    const visits = await prisma.ancVisit.findMany({
      where: {
        nextVisitDate: { lt: now, not: null },
        // Only raise overdue for visits in active pregnancies.
        pregnancy: { status: 'ACTIVE' },
      },
      include: {
        pregnancy: { select: { patientId: true } },
      },
      take: this.BATCH_SIZE,
      orderBy: { nextVisitDate: 'asc' },
    });

    let created = 0;
    for (const visit of visits) {
      const patientId = visit.pregnancy?.patientId;
      if (!patientId || !visit.nextVisitDate) continue;

      try {
        const reminder = await prisma.mchReminder.create({
          data: {
            patientId,
            ancVisitId: visit.id,
            reminderType: MchReminderType.ANC_OVERDUE,
            eventDate: visit.nextVisitDate,
            status: ReminderStatus.PENDING,
          },
        });

        await this.mchQueue.add(
          'send-mch-reminder',
          {
            reminderId: reminder.id,
            type: MchReminderType.ANC_OVERDUE,
            patientId,
          },
          { jobId: `mch-overdue-${reminder.id}` },
        );

        created++;
      } catch (err: any) {
        if (err?.code === 'P2002') {
          this.logger.debug(
            `Overdue ANC reminder already exists for visit ${visit.id} — skipping`,
          );
        } else {
          this.logger.error(
            `Failed to create overdue ANC reminder for visit ${visit.id}`,
            err,
          );
        }
      }
    }

    return created;
  }
}
