"use client";
import { useState, useEffect } from "react";
import { auth } from "../../firebase"; // 경로 주의 (../../firebase)
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { provider } from "../../firebase";

// --- [컴포넌트 1: 상단 네비게이션] ---
const TopNav = ({ user, handleLogin, handleLogout, theme }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', backgroundColor: theme.card, borderBottom: `1px solid ${theme.border}`, position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ fontSize: 20, fontWeight: 'bold', color: theme.text, cursor: 'pointer' }} onClick={() => window.location.href='/'}>🥚 InvestLogic</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        {user ? <button onClick={handleLogout} style={{ padding:'6px 12px', fontSize:12, backgroundColor: theme.bg, color: theme.text, border:`1px solid ${theme.border}`, borderRadius:4, cursor:'pointer' }}>로그아웃</button> 
              : <button onClick={handleLogin} style={{ padding:'6px 12px', fontSize:12, backgroundColor: theme.primary, color:'white', border:'none', borderRadius:4, fontWeight:'bold', cursor:'pointer' }}>로그인</button>}
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: theme.text }}>☰</button>
      </div>
      {isMenuOpen && (
        <div style={{ position: 'absolute', top: '60px', right: '20px', width: '200px', backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div onClick={() => window.location.href='/'} style={{ padding: '12px 15px', borderBottom: `1px solid ${theme.border}`, cursor: 'pointer', color: theme.text }}>🏠 홈 (분할계산기)</div>
          <div onClick={() => window.location.href='/datalab'} style={{ padding: '12px 15px', borderBottom: `1px solid ${theme.border}`, cursor: 'pointer', color: theme.primary, fontWeight: 'bold' }}>📊 데이터 랩</div>
          <div onClick={() => window.location.href='/admin'} style={{ padding: '12px 15px', cursor: 'pointer', color: theme.subText, fontSize: 12 }}>🔒 어드민 센터</div>
        </div>
      )}
    </div>
  );
};

// --- [컴포넌트 2: 트레이딩뷰 경제지표 캘린더] ---
const EconomicCalendar = ({ theme }) => {
  useEffect(() => {
    const container = document.getElementById("tv-economic-calendar");
    if (container && !container.hasChildNodes()) {
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-events.js";
      script.async = true;
      script.innerHTML = JSON.stringify({
        "colorTheme": "dark",
        "isTransparent": true,
        "width": "100%",
        "height": "400",
        "locale": "kr",
        "importanceFilter": "-1,0,1",
        "currencyFilter": "USD,KRW"
      });
      container.appendChild(script);
    }
  }, []);
  return <div id="tv-economic-calendar" style={{ height: '400px', overflow: 'hidden' }}></div>;
};

export default function DataLab() {
  const [user, setUser] = useState(null);
  
  // 🔥 라이트모드 베이스 (확장프로그램이 예쁘게 다크모드로 반전시킴)
  const theme = { bg: "#F2F2F7", card: "#FFFFFF", text: "#000000", subText: "#6e6e73", border: "#d1d1d6", primary: "#0a84ff" };

  useEffect(() => {
    document.body.style.backgroundColor = theme.bg;
    document.body.style.margin = "0";
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    return () => unsubscribe();
  }, [theme.bg]);

  const handleLogin = async () => { try { await signInWithPopup(auth, provider); } catch (e) {} };
  const handleLogout = () => { signOut(auth); };

  // 🔥 자바스크립트 자동 달력 로직 (미국: 3번째 금요일, 한국: 2번째 목요일)
  const getOptionDates = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    const getNthDay = (y, m, dayOfWeek, n) => {
      const firstOfMonth = new Date(y, m, 1);
      let day = firstOfMonth.getDay();
      let diff = dayOfWeek - day;
      if (diff < 0) diff += 7;
      return new Date(y, m, 1 + diff + (n - 1) * 7);
    };

    const krDate = getNthDay(year, month, 4, 2); // 4=목요일, 2번째
    const usDate = getNthDay(year, month, 5, 3); // 5=금요일, 3번째

    return { 
        kr: `${krDate.getMonth() + 1}월 ${krDate.getDate()}일 (목)`, 
        us: `${usDate.getMonth() + 1}월 ${usDate.getDate()}일 (금)` 
    };
  };
  const optionDates = getOptionDates();

  // 🔥 노션 퍼블릭 웹 게시 링크 연결
  const notionInsightsUrl = "여기에_월간리포트_노션_링크_붙여넣기";
  const notionStocksUrl = "여기에_종목탐구_노션_링크_붙여넣기";

  return (
    <>
      <style>{`
        .lab-layout { display: grid; grid-template-columns: 1fr; gap: 20px; max-width: 1200px; margin: 0 auto; padding: 20px; }
        @media (min-width: 768px) { .lab-layout { grid-template-columns: 1fr 1fr; align-items: start; } }
        .lab-card { background-color: ${theme.card}; border: 1px solid ${theme.border}; border-radius: 12px; padding: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
        .card-title { color: ${theme.text}; margin-top: 0; margin-bottom: 15px; border-bottom: 1px solid ${theme.border}; padding-bottom: 10px; font-size: 18px; }
      `}</style>

      <TopNav user={user} handleLogin={handleLogin} handleLogout={handleLogout} theme={theme} />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', paddingBottom: 0 }}>
        <h2 style={{ color: theme.text, marginTop: 10 }}>📊 데이터 랩 (Data Lab)</h2>
        <p style={{ color: theme.subText, fontSize: 14 }}>시장의 주요 지표와 인베스트로직 인사이트를 한눈에 확인하세요.</p>
      </div>

      <div className="lab-layout" style={{ fontFamily: '-apple-system, sans-serif' }}>
        
        {/* --- [좌측 열] --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* 1. 옵션 만기일 (자동 로직) */}
            <div className="lab-card">
                <h3 className="card-title">📅 이번 달 옵션 만기일</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1, backgroundColor: theme.bg, padding: '15px', borderRadius: '8px', textAlign: 'center', border: `1px solid ${theme.border}` }}>
                        <div style={{ fontSize: 12, color: theme.subText, marginBottom: 5 }}>🇰🇷 한국 (매월 2째주 목)</div>
                        <div style={{ fontSize: 18, fontWeight: 'bold', color: theme.text }}>{optionDates.kr}</div>
                    </div>
                    <div style={{ flex: 1, backgroundColor: theme.bg, padding: '15px', borderRadius: '8px', textAlign: 'center', border: `1px solid ${theme.border}` }}>
                        <div style={{ fontSize: 12, color: theme.subText, marginBottom: 5 }}>🇺🇸 미국 (매월 3째주 금)</div>
                        <div style={{ fontSize: 18, fontWeight: 'bold', color: '#ff453a' }}>{optionDates.us}</div>
                    </div>
                </div>
            </div>

            {/* 2. 경제지표 캘린더 (트레이딩뷰 위젯) */}
            <div className="lab-card">
                <h3 className="card-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>📈 주요 경제지표 캘린더</span>
                    <span style={{ fontSize: 11, color: theme.primary, backgroundColor: 'rgba(10, 132, 255, 0.1)', padding: '2px 8px', borderRadius: 10 }}>실시간 연동</span>
                </h3>
                {/* 관리자 공지란 */}
                <div style={{ backgroundColor: '#fff3cd', border: '1px solid #ffeeba', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: 13, color: '#856404' }}>
                    📌 <b>[관리자 코멘트]</b> 이번 주 목요일 밤 10시 30분, 미국 CPI 발표에 주의하세요. 단기 변동성 확대가 예상됩니다.
                </div>
                <div style={{ backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden', border: `1px solid ${theme.border}` }}>
                    <EconomicCalendar theme={theme} />
                </div>
            </div>

        </div>

        {/* --- [우측 열] --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* 3. 시장 통계 및 인사이트 (노션 연동) */}
            <div className="lab-card">
                <h3 className="card-title">💡 시장 통계 및 인사이트</h3>
                <div style={{ backgroundColor: theme.bg, padding: '20px', borderRadius: '8px', textAlign: 'center', border: `1px solid ${theme.border}` }}>
                    <div style={{ fontSize: 40, marginBottom: 10 }}>📊</div>
                    <div style={{ color: theme.text, fontWeight: 'bold', marginBottom: 5 }}>인베스트로직 월간 리포트</div>
                    <div style={{ color: theme.subText, fontSize: 13, marginBottom: 20 }}>월별 3대 지수 통계 및 연도별 하락장 요약 데이터를 제공합니다.</div>
                    <button onClick={() => window.open(notionInsightsUrl, '_blank')} style={{ padding: '12px 24px', backgroundColor: theme.text, color: theme.card, border: 'none', borderRadius: '25px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>
                        📄 노션에서 리포트 전문 보기
                    </button>
                </div>
            </div>

            {/* 4. 종목탐구 (노션 연동) */}
            <div className="lab-card">
                <h3 className="card-title">🔍 종목 탐구 (19종 체크리스트)</h3>
                <div style={{ backgroundColor: theme.bg, padding: '20px', borderRadius: '8px', textAlign: 'center', border: `1px solid ${theme.border}` }}>
                    <div style={{ fontSize: 40, marginBottom: 10 }}>🏢</div>
                    <div style={{ color: theme.text, fontWeight: 'bold', marginBottom: 5 }}>SaaS 형태의 기업 펀더멘털 분석</div>
                    <div style={{ color: theme.subText, fontSize: 13, marginBottom: 20 }}>시가총액, 영업이익, 현금흐름 등 19가지 항목을 분석한 데이터베이스입니다.</div>
                    <button onClick={() => window.open(notionStocksUrl, '_blank')} style={{ padding: '12px 24px', backgroundColor: theme.primary, color: 'white', border: 'none', borderRadius: '25px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>
                        📄 19종 체크리스트 표 확인하기
                    </button>
                </div>
            </div>

        </div>
      </div>
    </>
  );
}