import React from "react";

export default function SidebarWidget() {
  return (
    <div className="mx-auto mb-10 w-full max-w-60 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 px-4 py-5 text-center text-white shadow-md shadow-brand-500/20">
      <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Live ops</p>
      <h3 className="mt-1 text-base font-semibold">Need real-time dispatch?</h3>
      <p className="mt-1 text-xs leading-relaxed text-white/80">
        Connect drivers, GPS feeds and webhooks to upgrade this dashboard to a full dispatch console.
      </p>
      <a
        href="mailto:info@bookarlandataxi.se?subject=Dispatch%20console"
        className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-white/15 px-3 py-2 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/25"
      >
        Talk to ops
      </a>
    </div>
  );
}
