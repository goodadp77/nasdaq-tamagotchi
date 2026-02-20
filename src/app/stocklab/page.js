"use client";
import { useState, useEffect } from "react";
import { auth, db, provider } from "../../firebase"; // 경로 주의 (../../firebase)
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

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
          <div onClick={() => window.location.href='/stocklab'} style={{ padding: '12px 15px', borderBottom: `1px solid ${theme.border}`, cursor: 'pointer', color: theme.primary, fontWeight: 'bold' }}>🔍 종목탐구 LAB</div>
          <div style={{ padding: '12px 15px', borderBottom: `1px solid ${theme.border}`, cursor: 'pointer', color: theme.text }}>💎 PRO 등급 안내</div>
          <div style={{ padding: '12px 15px', borderBottom: `1px solid ${theme.border}`, cursor: 'pointer', color: theme.text }}>⚙️ 마이페이지</div>
          <div onClick={() => window.location.href='/admin'} style={{ padding: '12px 15px', cursor: 'pointer', color: theme.subText, fontSize: 12 }}>🔒 어드민 센터</div>
        </div>
      )}
    </div>
  );
};

export default function StockLab() {
  const [user, setUser] = useState(null);
  const [userTier, setUserTier] = useState("FREE");
  const [loading, setLoading] = useState(true);
  
  const theme = { bg: "#F2F2F7", card: "#FFFFFF", text: "#000000", subText: "#6e6e73", border: "#d1d1d6", primary: "#0a84ff" };

  useEffect(() => {
    // 배경색 적용 로직 유지
    document.body.style.backgroundColor = theme.bg;
    document.body.style.margin = "0";

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          // DB의 tier(FREE, PRO, ADMIN)를 가져와 권한을 결정합니다.
          setUserTier(userSnap.data().tier || "FREE");
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [theme.bg]); // 의존성 배열을 이전과 동일하게 유지하여 에러 방지

  const handleLogin = async () => { try { await signInWithPopup(auth, provider); } catch (e) {} };
  const handleLogout = () => { signOut(auth); };

  // 🔥 PRO 전용 노션 링크
  const notionStocksUrl = "https://www.notion.so/INVEST-LOGIC-LAB-30dd5cc573fe80b8a2b0e74def1b96df?source=copy_link";

  // PRO 또는 ADMIN 등급인 경우만 콘텐츠 접근 허용
  const isPaidUser = userTier === "PRO" || userTier === "ADMIN";

  if (loading) return <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', backgroundColor: theme.bg, color: theme.text }}>⏳ 권한 확인 중...</div>;

  return (
    <div style={{ minHeight: '100vh', fontFamily: '-apple-system, sans-serif', backgroundColor: theme.bg }}>
      <TopNav user={user} handleLogin={handleLogin} handleLogout={handleLogout} theme={theme} />

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ color: theme.text, fontSize: 28, margin: 0 }}>🔍 종목탐구 LAB</h2>
            <p style={{ color: theme.subText, fontSize: 15, marginTop: 10 }}>위기 대응 시나리오와 기업 펀더멘털을 분석하는 전략 연구소</p>
        </div>

        {/* ---------------------------------------------------------
            🚩 1단계: 로그아웃 상태 (완전 잠금 + 로그인 유도)
        --------------------------------------------------------- */}
        {!user ? (
            <div style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: 16, padding: '50px 20px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: 50, marginBottom: 20 }}>🔒</div>
                <h3 style={{ color: theme.text, fontSize: 22, marginBottom: 15 }}>인베스트로직 회원 전용 공간입니다</h3>
                <p style={{ color: theme.subText, fontSize: 14, lineHeight: '1.6', marginBottom: 30 }}>
                    본 연구소의 데이터는 로그인을 하신 회원님께만 공개됩니다.<br/>
                    지금 바로 로그인하고 전문적인 하락 대응 시나리오를 확인하세요.
                </p>
                <button onClick={handleLogin} style={{ padding: '16px 40px', backgroundColor: theme.primary, color: 'white', border: 'none', borderRadius: '30px', fontWeight: 'bold', fontSize: 16, cursor: 'pointer' }}>
                    3초 만에 로그인하고 시작하기
                </button>
            </div>
        ) : (
            <>
                {/* ---------------------------------------------------------
                    🚩 2단계: 로그인 완료 (FREE 등급) - PRO 업셀링 화면
                --------------------------------------------------------- */}
                {!isPaidUser ? (
                    <div style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: 16, padding: '40px 20px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                        <div style={{ fontSize: 50, marginBottom: 20 }}>💎</div>
                        <h3 style={{ color: theme.text, fontSize: 20, marginBottom: 15 }}>PRO 등급 전용 콘텐츠입니다</h3>
                        <p style={{ color: theme.subText, fontSize: 14, lineHeight: '1.6', marginBottom: 30, maxWidth: '450px', margin: '0 auto 30px auto' }}>
                            단순한 정보 나열이 아닙니다. <b>하락장 방어와 멘탈 관리</b>를 위해<br/>
                            실제 전략과 연결된 전문 분석 데이터를 제공합니다.
                        </p>
                        
                        <div style={{ backgroundColor: theme.bg, padding: '20px', borderRadius: 12, textAlign: 'left', maxWidth: '400px', margin: '0 auto 30px auto', border: `1px solid ${theme.border}` }}>
                            <div style={{ color: '#6d28d9', fontWeight: 'bold', marginBottom: 10, fontSize: 13 }}>✨ PRO 종목탐구 LAB 독점 혜택</div>
                            <ul style={{ color: theme.text, fontSize: 13, margin: 0, paddingLeft: 20, lineHeight: '1.8' }}>
                                <li>19가지 핵심 지표 기반 펀더멘털 체크리스트</li>
                                <li>과거 하락 사이클 및 유사 패턴 정밀 분석</li>
                                <li>최대 하락폭 가정 및 단계별 대응 시나리오</li>
                                <li>투자 심리 회복 및 반등 예상 구간 도출</li>
                            </ul>
                        </div>

                        <button onClick={() => alert('PRO 등급 결제 안내 페이지로 이동합니다.')} style={{ padding: '16px 40px', backgroundColor: '#6d28d9', color: 'white', border: 'none', borderRadius: '30px', fontWeight: 'bold', fontSize: 16, cursor: 'pointer' }}>
                            PRO 등급 활성화 (리스크 대응 강화)
                        </button>
                    </div>
                ) : (
                    /* ---------------------------------------------------------
                        🚩 3단계: PRO 회원 (콘텐츠 완전 개방)
                    --------------------------------------------------------- */
                    <div style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: 16, padding: '30px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 20 }}>
                            <div style={{ fontSize: 30 }}>🏢</div>
                            <div>
                                <h3 style={{ color: theme.text, margin: 0, fontSize: 18 }}>SaaS 기업 펀더멘털 및 하락 시나리오</h3>
                                <p style={{ color: theme.subText, fontSize: 13, margin: '5px 0 0 0' }}>PRO 전용: 19종 체크리스트 및 과거 사이클 기반 대응 전략</p>
                            </div>
                        </div>
                        
                        <div style={{ backgroundColor: '#f5f3ff', padding: '15px', borderRadius: 8, marginBottom: 25, border: '1px solid #ddd6fe', fontSize: 13, color: '#4c1d95', lineHeight: '1.6' }}>
                            📌 <b>[PRO 전략 가이드]</b> 현재 시장 지수는 Z2(공포) 구간에 진입했습니다.<br/>
                            무리한 진입보다는 하단 버튼의 '최대 하락폭 시나리오'를 참고하여 본인의 현금 비중을 점검하시기 바랍니다.
                        </div>

                        <button onClick={() => window.open(notionStocksUrl, '_blank')} style={{ width: '100%', padding: '15px', backgroundColor: theme.text, color: theme.card, border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: 16, cursor: 'pointer' }}>
                            📄 리포트 전문 보기 (노션 연결)
                        </button>
                    </div>
                )}
            </>
        )}
      </div>
    </div>
  );
}