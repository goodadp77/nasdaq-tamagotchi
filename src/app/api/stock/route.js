import { NextResponse } from 'next/server';
import yahooFinanceImport from 'yahoo-finance2';

export async function GET() {
  try {
    // 야후 파이낸스 도구 조립 (에러 방지용)
    let yahooFinance;
    if (typeof yahooFinanceImport === 'function') {
        yahooFinance = new yahooFinanceImport();
    } else if (yahooFinanceImport.YahooFinance) {
        yahooFinance = new yahooFinanceImport.YahooFinance();
    } else {
        yahooFinance = yahooFinanceImport;
    }

    // 주식 데이터 가져오기
    const results = await Promise.all([
      yahooFinance.quote('^IXIC'), // 나스닥
      yahooFinance.quote('^DJI'),  // 다우
      yahooFinance.quote('^GSPC'), // S&P500
    ]);

    const data = {
      nasdaq: { price: results[0].regularMarketPrice, change: results[0].regularMarketChangePercent },
      dow: { price: results[1].regularMarketPrice, change: results[1].regularMarketChangePercent },
      sp500: { price: results[2].regularMarketPrice, change: results[2].regularMarketChangePercent }
    };

    return NextResponse.json(data);

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}