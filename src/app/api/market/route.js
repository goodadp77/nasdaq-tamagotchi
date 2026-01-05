import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

// 캐시 끄기 (항상 최신가 불러오기)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // 1. 야후 파이낸스 라이브러리 설정 (에러 방지용 안전장치)
    // import 방식 차이로 인한 에러를 막기 위해 default 객체를 확인합니다.
    const yf = yahooFinance.default || yahooFinance;
    
    // 불필요한 경고 메시지 끄기
    if (yf.suppressNotices) {
       yf.suppressNotices(['yahooSurvey', 'cookie']);
    }

    // 2. 데이터 가져오기 (나스닥 선물 + 주요 지수)
    const results = await Promise.all([
      yf.quote("NQ=F"),  // 나스닥 100 선물
      yf.quote("^NDX"),  // 나스닥 100 지수
      yf.quote("^GSPC"), // S&P 500
    ]);

    const [nq, ndx, sp500] = results;

    // 3. 화면에 보낼 데이터 정리
    const data = {
      main: {
        symbol: "NQ=F",
        price: nq.regularMarketPrice,
        change: nq.regularMarketChange,
        changePercent: nq.regularMarketChangePercent,
        time: nq.regularMarketTime,
      },
      indexes: {
        ndx: { price: ndx.regularMarketPrice, changePercent: ndx.regularMarketChangePercent },
        sp500: { price: sp500.regularMarketPrice, changePercent: sp500.regularMarketChangePercent },
      }
    };

    return NextResponse.json(data);

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Market Data Error', details: error.message },
      { status: 500 }
    );
  }
}