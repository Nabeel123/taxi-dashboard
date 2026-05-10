export type NotificationKind =
  | "new_booking"
  | "upcoming_trip"
  | "payment_success"
  | "trip_cancelled"
  | "flight_delay";

export const NOTIFICATION_KIND_LABELS: Record<NotificationKind, string> = {
  new_booking: "New booking",
  upcoming_trip: "Upcoming trip",
  payment_success: "Payment received",
  trip_cancelled: "Trip cancelled",
  flight_delay: "Flight delay",
};

export interface DispatchNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  description: string;
  createdAt: string;
  read: boolean;
  bookingId?: string;
}
