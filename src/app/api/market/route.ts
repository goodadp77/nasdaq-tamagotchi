import { NextResponse } from 'next/server';

// 캐시 끄기 (실시간 데이터 필수)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // [핵심] import 대신 require를 사용해 강제로 라이브러리를 가져옵니다.
    // 이렇게 하면 'Export doesn't exist' 같은 빌드 에러를 피할 수 있습니다.
    const pkg = require('yahoo-finance2');
    let yf = pkg.default || pkg;

    // [핵심] "Call new YahooFinance() first" 에러 방지용
    // 가져온 게 '기계(Instance)'가 아니라 '설계도(Class)'라면, 여기서 강제로 기계로 만듭니다.
    try {
      if (typeof yf === 'function' || typeof yf === 'object') {
        // 혹시 모를 상황에 대비해 새 인스턴스 생성을 시도합니다.
        const temp = new yf();
        yf = temp;
      }
    } catch (e) {
      // new yf()가 실패하면 이미 인스턴스인 것이므로 그냥 씁니다.
    }

    // 경고 메시지 끄기 (로그 오염 방지)
    if (yf.suppressNotices) {
      yf.suppressNotices(['yahooSurvey', 'cookie']);
    }

    // 데이터 가져오기 (나스닥 선물 NQ=F)
    const results = await Promise.all([
      yf.quote("NQ=F"),  // 나스닥 100 선물
      yf.quote("^NDX"),  // 나스닥 100 지수
      yf.quote("^GSPC"), // S&P 500
    ]);

    const [nq, ndx, sp500] = results;

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

  } catch (error: any) {
    console.error('Server Logic Error:', error);
    // 500 에러가 나더라도 브라우저에서 원인을 볼 수 있게 반환
    return NextResponse.json(
      { error: 'Backend Error', details: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}