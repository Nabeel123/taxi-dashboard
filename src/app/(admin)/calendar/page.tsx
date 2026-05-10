import type { Metadata } from "next";

import { PageHeader } from "@/components/dashboard/PageHeader";
import { BookingsCalendar } from "@/components/calendar/BookingsCalendar";
import { getBookings } from "@/services/bookings";

export const metadata: Metadata = {
  title: "Calendar",
  description: "Bookings calendar — visualize trips by day, week or month.",
};

export default async function CalendarPage() {
  const bookings = await getBookings(1000);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Booking calendar"
        description="Click any trip to open its details. Color reflects current booking status."
      />
      <BookingsCalendar bookings={bookings} />
    </div>
  );
}
