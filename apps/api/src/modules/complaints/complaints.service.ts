import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import {
  API_ERROR_CODES,
  BUSINESS_RULES,
  OrderStatus,
} from "@greenroots/shared";
import { desc, eq } from "drizzle-orm";
import { PG_ERROR_CODE } from "@/common/constants/error.constant";
import { MESSAGES } from "@/common/constants/messages.constant";
import { TIME_IN_MS } from "@/common/constants/time.constant";
import {
  DATABASE_CONNECTION,
  type DrizzleDB,
} from "@/database/database.module";
import { complaints, orders } from "@/database/schemas";
import { CloudinaryService } from "@/modules/media/cloudinary.service";
import type { ComplaintProjection, CreateComplaintInput } from "./dto";

const COMPLAINT_WINDOW_MS =
  BUSINESS_RULES.COMPLAINT_WINDOW_HOURS * TIME_IN_MS.HOUR;

const COMPLAINT_COLUMNS = {
  id: complaints.id,
  orderId: complaints.orderId,
  customerId: complaints.customerId,
  reason: complaints.reason,
  proofImageUrls: complaints.proofImageUrls,
  proofVideoUrl: complaints.proofVideoUrl,
  status: complaints.status,
  resolution: complaints.resolution,
  createdAt: complaints.createdAt,
  updatedAt: complaints.updatedAt,
} as const;

type ComplaintRow = Pick<
  typeof complaints.$inferSelect,
  keyof typeof COMPLAINT_COLUMNS
>;

function mapComplaintRow(row: ComplaintRow): ComplaintProjection {
  return {
    id: row.id,
    orderId: row.orderId,
    customerId: row.customerId,
    reason: row.reason,
    proofImageUrls: row.proofImageUrls,
    proofVideoUrl: row.proofVideoUrl,
    status: row.status,
    resolution: row.resolution,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const record = error as { code?: unknown; cause?: { code?: unknown } };
  return (
    record.code === PG_ERROR_CODE.UNIQUE_VIOLATION ||
    record.cause?.code === PG_ERROR_CODE.UNIQUE_VIOLATION
  );
}

/**
 * Customer complaint submission service enforcing 24-hour post-delivery eligibility,
 * anti-enumeration order ownership, single-complaint uniqueness, and out-of-transaction
 * Cloudinary media metadata verification (`ADR-0040`).
 */
@Injectable()
export class ComplaintsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: DrizzleDB,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Submits a complaint for an owned delivered/completed order within 24 hours of `deliveredAt`.
   */
  async submitComplaint(
    customerId: string,
    orderId: string,
    input: CreateComplaintInput,
    now: Date = new Date(),
  ): Promise<ComplaintProjection> {
    const [orderRow] = await this.db
      .select({
        id: orders.id,
        customerId: orders.customerId,
        orderStatus: orders.orderStatus,
        deliveredAt: orders.deliveredAt,
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!orderRow || orderRow.customerId !== customerId) {
      throw new NotFoundException({
        code: API_ERROR_CODES.ORDER_NOT_FOUND,
        detail: MESSAGES.ORDERS.NOT_FOUND,
      });
    }

    const isEligibleStatus =
      orderRow.orderStatus === OrderStatus.DELIVERED ||
      orderRow.orderStatus === OrderStatus.COMPLETED;

    if (!isEligibleStatus || orderRow.deliveredAt === null) {
      throw new UnprocessableEntityException({
        code: API_ERROR_CODES.ORDER_COMPLAINT_NOT_ELIGIBLE,
        detail: MESSAGES.COMPLAINTS.NOT_ELIGIBLE,
      });
    }

    if (now.getTime() - orderRow.deliveredAt.getTime() > COMPLAINT_WINDOW_MS) {
      throw new UnprocessableEntityException({
        code: API_ERROR_CODES.ORDER_COMPLAINT_WINDOW_EXPIRED,
        detail: MESSAGES.COMPLAINTS.WINDOW_EXPIRED,
      });
    }

    const [existingComplaint] = await this.db
      .select({ id: complaints.id })
      .from(complaints)
      .where(eq(complaints.orderId, orderId))
      .limit(1);

    if (existingComplaint) {
      throw new ConflictException({
        code: API_ERROR_CODES.ORDER_COMPLAINT_ALREADY_EXISTS,
        detail: MESSAGES.COMPLAINTS.ALREADY_EXISTS,
      });
    }

    // Verify uploaded media metadata via Cloudinary Admin API strictly outside any DB transaction (`ADR-0040`).
    await this.cloudinaryService.verifyComplaintMedia(
      input.proofImageUrls,
      input.proofVideoUrl,
    );

    try {
      const [created] = await this.db
        .insert(complaints)
        .values({
          orderId,
          customerId,
          reason: input.reason,
          proofImageUrls: input.proofImageUrls,
          proofVideoUrl: input.proofVideoUrl ?? null,
        })
        .returning(COMPLAINT_COLUMNS);

      if (!created) {
        throw new Error("Failed to insert complaint.");
      }

      return mapComplaintRow(created);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException({
          code: API_ERROR_CODES.ORDER_COMPLAINT_ALREADY_EXISTS,
          detail: MESSAGES.COMPLAINTS.ALREADY_EXISTS,
        });
      }
      throw error;
    }
  }

  /**
   * Lists a customer's complaints for an owned order, returning `[]` when none exist.
   * Enforces the same anti-enumeration ownership boundary as `submitComplaint`.
   */
  async listComplaints(
    customerId: string,
    orderId: string,
  ): Promise<ComplaintProjection[]> {
    const [orderRow] = await this.db
      .select({
        id: orders.id,
        customerId: orders.customerId,
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!orderRow || orderRow.customerId !== customerId) {
      throw new NotFoundException({
        code: API_ERROR_CODES.ORDER_NOT_FOUND,
        detail: MESSAGES.ORDERS.NOT_FOUND,
      });
    }

    const rows = await this.db
      .select(COMPLAINT_COLUMNS)
      .from(complaints)
      .where(eq(complaints.orderId, orderId))
      .orderBy(desc(complaints.createdAt));

    return rows.map(mapComplaintRow);
  }
}
