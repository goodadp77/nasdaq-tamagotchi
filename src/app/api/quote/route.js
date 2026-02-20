import { NextResponse } from "next/server";

// GET /api/ndx?days=120
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const days = Math.max(10, Math.min(365, Number(searchParams.get("days") || 120)));

    // Stooq NDX index: ^ndx
const url = `https://api.allorigins.win/raw?url=${encodeURIComponent("https://stooq.com/q/d/l/?s=%5Endx&i=d")}`;

const r = await fetch(url, { cache: "no-store" });

    if (!r.ok) {
      return NextResponse.json({ ok: false, error: "stooq_upstream", status: r.status }, { status: 502 });
    }

    const text = await r.text();
    const lines = text.trim().split("\n");
    if (lines.length < 2) {
      return NextResponse.json({ ok: false, error: "stooq_empty" }, { status: 502 });
    }

    // CSV: Date,Open,High,Low,Close,Volume
    const header = lines[0].split(",");
    const idxDate = header.indexOf("Date");
    const idxClose = header.indexOf("Close");

    if (idxDate < 0 || idxClose < 0) {
      return NextResponse.json({ ok: false, error: "stooq_bad_header" }, { status: 502 });
    }

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",");
      const date = parts[idxDate];
      const close = Number(parts[idxClose]);
      if (!date || !Number.isFinite(close)) continue;
      rows.push({ date, close });
    }

    if (rows.length === 0) {
      return NextResponse.json({ ok: false, error: "stooq_no_rows" }, { status: 502 });
    }

    const series = rows.slice(-days);
    const last = series[series.length - 1];

    return NextResponse.json({
      ok: true,
      symbol: "^NDX",
      lastClose: last.close,
      lastDate: last.date,
      series, // [{date, close}]
      source: "stooq",
      delay: "delayed",
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "server_error", message: String(e?.message || e) }, { status: 500 });
  }
}
