import React from "react";
import Badge from "@/components/ui/badge/Badge";
import {
  BOOKING_STATUS_LABELS,
  type BookingStatus,
  PAYMENT_STATUS_LABELS,
  type PaymentStatus,
} from "@/types/booking";
import { type DriverStatus, DRIVER_STATUS_LABELS } from "@/types/driver";

type BadgeColor = React.ComponentProps<typeof Badge>["color"];

const STATUS_COLOR: Record<BookingStatus, BadgeColor> = {
  pending: "warning",
  confirmed: "info",
  driver_assigned: "primary",
  on_the_way: "primary",
  picked_up: "primary",
  completed: "success",
  cancelled: "error",
};

const PAYMENT_COLOR: Record<PaymentStatus, BadgeColor> = {
  paid: "success",
  unpaid: "warning",
  refunded: "error",
  quote: "info",
};

const DRIVER_COLOR: Record<DriverStatus, BadgeColor> = {
  online: "success",
  on_trip: "primary",
  break: "warning",
  offline: "light",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <Badge size="sm" color={STATUS_COLOR[status]} variant="light">
      {BOOKING_STATUS_LABELS[status]}
    </Badge>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge size="sm" color={PAYMENT_COLOR[status]} variant="light">
      {PAYMENT_STATUS_LABELS[status]}
    </Badge>
  );
}

export function DriverStatusBadge({ status }: { status: DriverStatus }) {
  return (
    <Badge size="sm" color={DRIVER_COLOR[status]} variant="light">
      {DRIVER_STATUS_LABELS[status]}
    </Badge>
  );
}
