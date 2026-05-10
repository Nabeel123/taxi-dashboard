"use client";

import { useMemo, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, EventInput } from "@fullcalendar/core";
import { useRouter } from "next/navigation";

import type { Booking, BookingStatus } from "@/types/booking";

const STATUS_COLOR: Record<BookingStatus, { bg: string; border: string }> = {
  pending: { bg: "#fef3c7", border: "#f59e0b" },
  confirmed: { bg: "#dbeafe", border: "#3b82f6" },
  driver_assigned: { bg: "#ede9fe", border: "#8b5cf6" },
  on_the_way: { bg: "#cffafe", border: "#06b6d4" },
  picked_up: { bg: "#dcfce7", border: "#10b981" },
  completed: { bg: "#dcfce7", border: "#16a34a" },
  cancelled: { bg: "#fee2e2", border: "#ef4444" },
};

interface BookingsCalendarProps {
  bookings: Booking[];
}

export function BookingsCalendar({ bookings }: BookingsCalendarProps) {
  const router = useRouter();
  const calendarRef = useRef<FullCalendar>(null);

  const events = useMemo<EventInput[]>(
    () =>
      bookings.map((b) => {
        const colors = STATUS_COLOR[b.status];
        const start = new Date(b.pickupAt);
        const end = new Date(start.getTime() + 60 * 60_000); /* assume 1h slot for visualisation */
        return {
          id: b.id,
          title: `${b.customer.name} · ${b.pickupLocation.split(",")[0]}`,
          start: start.toISOString(),
          end: end.toISOString(),
          backgroundColor: colors.bg,
          borderColor: colors.border,
          textColor: "#0f172a",
          extendedProps: { status: b.status },
        };
      }),
    [bookings],
  );

  const handleEventClick = (info: EventClickArg) => {
    const id = info.event.id;
    if (id) router.push(`/bookings/${id}`);
  };

  return (
    <div className="custom-calendar overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
        }}
        buttonText={{ today: "Today", month: "Month", week: "Week", day: "Day", list: "List" }}
        events={events}
        eventClick={handleEventClick}
        height="auto"
        nowIndicator
        dayMaxEvents={3}
      />
    </div>
  );
}
