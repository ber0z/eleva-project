"use client";

import { useState } from "react";

type Props = {
    dateFrom: string;
    dateTo: string;
    onChange: (from: string, to: string) => void;
};

function formatDate(d: Date): string {
    return d.toISOString().slice(0, 10);
}

export default function DateRangeFilter({ dateFrom, dateTo, onChange }: Props) {
    const presets = [
        { label: "7d", days: 7 },
        { label: "30d", days: 30 },
        { label: "90d", days: 90 },
    ];

    function applyPreset(days: number) {
        const to = new Date();
        const from = new Date();
        from.setDate(from.getDate() - days);
        onChange(formatDate(from), formatDate(to));
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            {presets.map((p) => (
                <button
                    key={p.label}
                    onClick={() => applyPreset(p.days)}
                    className="rounded-lg border border-border/30 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition"
                >
                    {p.label}
                </button>
            ))}
            <div className="flex items-center gap-1.5">
                <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => onChange(e.target.value, dateTo)}
                    className="rounded-lg border border-border/30 bg-background px-2.5 py-1.5 text-xs"
                />
                <span className="text-xs text-muted-foreground">a</span>
                <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => onChange(dateFrom, e.target.value)}
                    className="rounded-lg border border-border/30 bg-background px-2.5 py-1.5 text-xs"
                />
            </div>
        </div>
    );
}
