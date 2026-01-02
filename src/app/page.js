"use client";
import { useState, useEffect, useRef } from "react";
import { auth, provider, db } from "../firebase"; 
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, updateDoc, orderBy } from "firebase/firestore";

// --- [컴포넌트 1: 시장 상황 게이지] ---
const MarketGauge = ({ status, emoji, theme }) => {
  const statusScore = { "공포 (Fear)": 30, "주의 (Caution)": 50 };
  const score = statusScore[status] || 50; 
  const angle = (score / 100 * 180) - 90;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '20px 0' }}>
      <svg width="240" height="130" viewBox="0 0 240 130">
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff3b30" /> 
            <stop offset="30%" stopColor="#ff9500" /> 
            <stop offset="70%" stopColor="#ffcc00" /> 
            <stop offset="100%" stopColor="#34c759" /> 
          </linearGradient>
        </defs>
        <path d="M 20 120 A 100 100 0 0 1 220 120" fill="none" stroke="url(#gaugeGradient)" strokeWidth="18" strokeLinecap="butt" />
        {[-45, 0, 45].map((sepAngle) => (
          <line key={sepAngle} x1="120" y1="10" x2="120" y2="30" stroke={theme.bg} strokeWidth="3" transform={`rotate(${sepAngle} 120 120)`} />
        ))}
        <text x="20" y="145" fontSize="12" fill={theme.subText} textAnchor="middle" fontWeight="bold">공포</text>
        <text x="220" y="145" fontSize="12" fill={theme.subText} textAnchor="middle" fontWeight="bold">탐욕</text>
        <g transform={`translate(120, 120) rotate(${angle})`}>
          <path d="M -5 0 L 0 -105 L 5 0 Z" fill={theme.text} />
          <circle cx="0" cy="0" r="8" fill={theme.text} />
        </g>
      </svg>
      <div style={{ marginTop: -30, textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 45, marginBottom: 0, lineHeight: 1 }}>{emoji}</div>
          <div style={{ fontWeight: 'bold', fontSize: 18, color: theme.text, marginTop: 10 }}>{status}</div>
      </div>
    </div>
  );
};

// --- [✨ 컴포넌트 2: CNN 스타일 차트 (로고 삭제 & 와이드)] ---
const TradingViewChart = ({ theme }) => {
  const chartContainerId = "tradingview_widget_container";

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    loadScript("https://s3.tradingview.com/tv.js").then(() => {
      if (window.TradingView) {
        new window.TradingView.widget({
          "width": "100%",
          "height": 350, // 높이를 키워 시원하게
          "symbol": "FOREXCOM:NAS100",
          "interval": "D",
          "timezone": "Asia/Seoul",
          "theme": "dark", // 🔥 무조건 다크모드
          "style": "3", // 영역 차트 (Area)
          "locale": "kr",
          "toolbar_bg": "#000000",
          "enable_publishing": false,
          "hide_top_toolbar": true,    // 상단 툴바 제거 (종목명 최소화)
          "hide_side_toolbar": true,   // 측면 그리기 도구 제거
          "hide_legend": false,        // 🔥 OHLC 데이터 표시를 위해 켜둠 (단, 스타일로 텍스트 숨김 처리 시도 불가하므로 깔끔하게 둠)
          "save_image": false,
          "container_id": chartContainerId,
          "backgroundColor": "#000000", // 🔥 배경 완전 블랙
          "gridLineColor": "rgba(42, 46, 57, 0.3)", // 그리드 선 흐리게
          "scalePosition": "right",
          "scaleMode": "Normal",
        });
      }
    });
  }, []);

  return (
    <div style={{ 
        marginTop: 20, 
        borderTop: `1px solid ${theme.border}`, 
        paddingTop: 0,
        marginLeft: -15, // 🔥 [Wide] 부모 패딩 무시하고 왼쪽으로 확장
        marginRight: -15, // 🔥 [Wide] 부모 패딩 무시하고 오른쪽으로 확장
        position: 'relative', // 로고 가리기용 기준점
        backgroundColor: '#000000' // 차트 영역 배경 블랙 강제
    }}>
      <div id={chartContainerId} style={{ height: "350px" }} />
      
      {/* ⬛ 로고 가리기용 마스크 (좌측 하단) */}
      <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '40px',
          height: '35px',
          backgroundColor: '#000000', // 차트 배경색과 동일
          zIndex: 10
      }}></div>

      {/* ⬛ 종목명(좌측 상단) 텍스트 일부 가리기 (선택사항) */}
      {/* 트레이딩뷰 정책상 종목명 완전 제거는 어렵지만, 위젯 설정으로 최소화함 */}
    </div>
  );
};


export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // --- [🎨 테마 시스템: 확장 프로그램 호환] ---
  const theme = {
    bg: "#F2F2F7",       
    card: "#FFFFFF",     
    text: "#000000",     
    subText: "#6e6e73",  
    border: "#d1d1d6",   
    inputBg: "#F2F2F7",  
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.body.style.backgroundColor = theme.bg;
      document.body.style.margin = "0";
    }
  }, [theme.bg]);

  // 1. 자산 설정
  const [totalCapital, setTotalCapital] = useState(100000000); 
  const [stockSettings, setStockSettings] = useState({
    "TQQQ": { percent: 20, currentPrice: 55 },
    "SOXL": { percent: 20, currentPrice: 30 },
    "BTC":  { percent: 10, currentPrice: 90000 },
    "ETH":  { percent: 10, currentPrice: 3000 }
  });
  const [symbol, setSymbol] = useState("TQQQ"); 
  
  // 2. 정산 데이터
  const [tradeHistory, setTradeHistory] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editPrice, setEditPrice] = useState("");

  // --- [전략 템플릿] ---
  const marketTemplates = {
    "공포": {
      status: "공포 (Fear)",
      emoji: "🥶", 
      ratios: [4, 4, 4, 8, 8, 8, 12, 12, 20, 20],
      drops:  [0, 0.05, 0.10, 0.15, 0.20, 0.28, 0.33, 0.38, 0.43, 0.48] 
    }
  };
  const currentMarket = marketTemplates["공포"];

  // --- [Firebase 연동] ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        const q = query(collection(db, "trades"), where("uid", "==", currentUser.uid), orderBy("date", "desc"));
        const unsubscribeDb = onSnapshot(q, (snapshot) => {
          setTradeHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribeDb();
      } else { setTradeHistory([]); }
    });
    return () => unsubscribeAuth();
  }, []);

  const handleLogin = async () => { try { await signInWithPopup(auth, provider); } catch (e) {} };
  const handleLogout = () => { signOut(auth); };

  // --- [계산 엔진] ---
  const getPlanData = () => {
    const mySetting = stockSettings[symbol] || { percent: 0, currentPrice: 0 };
    const allocatedBudget = (totalCapital * mySetting.percent) / 100;
    const basePrice = mySetting.currentPrice;

    return currentMarket.ratios.map((percent, index) => {
      const dropRate = currentMarket.drops[index] || 0;
      const targetPrice = basePrice * (1 - dropRate); 
      const amount = (allocatedBudget * percent) / 100; 
      
      const qty = targetPrice > 0 ? amount / targetPrice : 0;
      const isExecuted = tradeHistory.some(t => t.symbol === symbol && t.round === (index + 1) && t.type === 'buy');

      // 예상 평단 계산
      let accumAmount = 0;
      let accumQty = 0;
      for (let i = 0; i <= index; i++) {
         const pRate = currentMarket.drops[i] || 0;
         const pPrice = basePrice * (1 - pRate);
         const pAmt = (allocatedBudget * currentMarket.ratios[i]) / 100;
         accumAmount += pAmt;
         accumQty += (pPrice > 0 ? pAmt / pPrice : 0);
      }
      const avgPrice = accumQty > 0 ? accumAmount / accumQty : 0;

      return {
        turn: index + 1,
        dropRate: dropRate,
        targetPrice: targetPrice,
        percent: percent,
        amount: amount,
        expectedQty: qty,
        expectedAvg: avgPrice,
        isExecuted: isExecuted
      };
    });
  };

  const buyPlan = getPlanData();
  const mySetting = stockSettings[symbol];
  const allocatedBudget = (totalCapital * mySetting.percent) / 100;

  const updateStockSetting = (key, value) => {
    setStockSettings(prev => ({
      ...prev,
      [symbol]: { ...prev[symbol], [key]: Number(value) }
    }));
  };

  const toggleExecution = async (planItem) => {
    if (!user) { alert("로그인이 필요합니다."); return; }
    if (planItem.isExecuted) { alert("이미 실행된 회차입니다."); return; }

    if (confirm(`${symbol} ${planItem.turn}회차 (목표가: ${Math.floor(planItem.targetPrice).toLocaleString()}) 기록하시겠습니까?`)) {
      try {
        await addDoc(collection(db, "trades"), {
          uid: user.uid,
          symbol: symbol,
          type: "buy", 
          round: planItem.turn,
          amount: Math.floor(planItem.amount), 
          price: Number(planItem.targetPrice.toFixed(2)), 
          qty: Number(planItem.expectedQty.toFixed(4)),   
          date: new Date().toISOString(),
          memo: "자동등록됨"
        });
      } catch (e) { alert("저장 실패"); }
    }
  };

  const deleteTrade = async (id) => { if(confirm("삭제?")) await deleteDoc(doc(db, "trades", id)); };
  
  const saveEdit = async (trade) => {
    if (!editPrice || isNaN(editPrice)) return alert("가격 확인 필요");
    const priceNum = Number(editPrice);
    const calculatedQty = priceNum > 0 ? trade.amount / priceNum : 0;
    await updateDoc(doc(db, "trades", trade.id), { price: priceNum, qty: calculatedQty });
    setEditingId(null);
  };

  const myTrades = tradeHistory.filter(t => t.symbol === symbol && t.type === 'buy');
  const totalInvested = myTrades.reduce((acc, cur) => acc + cur.amount, 0);
  const totalQty = myTrades.reduce((acc, cur) => acc + (cur.qty || 0), 0);
  const realAvgPrice = totalQty > 0 ? totalInvested / totalQty : 0;

  // --- [스타일 생성기] ---
  const styles = getStyles(theme);

  if (loading) return <div style={styles.loading}>⏳ 로딩 중...</div>;

  return (
    <div style={styles.container}>
      {/* 1. 헤더 및 총 자본금 */}
      <div style={styles.topBar}>
        <div style={styles.header}>
          <span style={styles.logo}>🥚 나스닥 다마고치 V6</span>
          {user ? <button onClick={handleLogout} style={styles.smallBtn}>로그아웃</button> 
                : <button onClick={handleLogin} style={styles.loginBtn}>로그인</button>}
        </div>
        
        {/* 게이지 섹션 + CNN 스타일 차트 (와이드 적용) */}
        <div style={styles.gaugeSection}>
             <MarketGauge status={currentMarket.status} emoji={currentMarket.emoji} theme={theme} />
             {/* 📊 CNN 스타일 차트 */}
             <TradingViewChart theme={theme} />
        </div>

        <div style={styles.capitalBox}>
          <label style={{color: theme.subText, fontSize:12}}>나의 총 투자 원금 (Total Capital)</label>
          <div style={{display:'flex', alignItems:'center', gap:10}}>
             <span style={{fontSize:20, fontWeight:'bold', color: theme.text}}>₩</span>
             <input 
                type="text" 
                value={totalCapital.toLocaleString()} 
                onChange={(e) => {
                   const val = e.target.value.replaceAll(',', '');
                   if(!isNaN(val)) setTotalCapital(Number(val));
                }}
                style={styles.capitalInput}
            />
          </div>
        </div>
      </div>

      {/* 2. 종목 선택 및 비중 */}
      <div style={styles.section}>
        <div style={styles.tabContainer}>
            {Object.keys(stockSettings).map((t) => (
                <button key={t} onClick={() => setSymbol(t)} style={symbol === t ? styles.activeTab : styles.tab}>{t}</button>
            ))}
        </div>

        <div style={styles.controlGrid}>
            <div style={styles.controlItem}>
                <label style={{color: theme.text}}>이 종목 비중 (%)</label>
                <div style={{display:'flex', alignItems:'center'}}>
                    <input 
                        type="number" 
                        value={mySetting.percent}
                        onChange={(e) => updateStockSetting('percent', e.target.value)}
                        style={styles.smallInput}
                    />
                    <span style={{marginLeft:5, color: theme.text}}>%</span>
                </div>
            </div>
            <div style={styles.controlItem}>
                <label style={{color: theme.text}}>배정된 투자금</label>
                <div style={{color:'#30d158', fontWeight:'bold', fontSize:18}}>
                    {Math.floor(allocatedBudget).toLocaleString()} <span style={{fontSize:12}}>원</span>
                </div>
            </div>
        </div>

        <div style={{...styles.controlItem, marginTop:10}}>
            <label style={{color: theme.text}}>현재 기준 가격 (Start Price)</label>
            <input 
                type="number" 
                value={mySetting.currentPrice}
                onChange={(e) => updateStockSetting('currentPrice', e.target.value)}
                style={styles.fullInput}
                placeholder="현재가 입력"
            />
            <p style={{fontSize:11, color: theme.subText, marginTop:5}}>* 이 가격을 기준으로 하락 목표가가 계산됩니다.</p>
        </div>
      </div>

      {/* 3. 전략 테이블 */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
            <h3 style={{color: theme.text}}>📉 매수 플랜 상세</h3>
        </div>

        <div style={styles.tableScroll}>
            <div style={styles.tableHeader}>
                <div style={{width:40}}>실행</div>
                <div style={{width:50}}>회차</div>
                <div style={{width:60}}>하락%</div>
                <div style={{width:80, color:'#81b0ff'}}>목표가</div>
                <div style={{width:50}}>비중</div>
                <div style={{width:100, textAlign:'right'}}>매수금액</div>
                <div style={{width:80, textAlign:'right', color: theme.subText}}>예상평단</div>
            </div>
            
            {buyPlan.map((plan) => (
                <div key={plan.turn} style={plan.isExecuted ? styles.rowExecuted : styles.row}>
                    <div style={{width:40}}>
                        <input 
                            type="checkbox" 
                            checked={plan.isExecuted} 
                            onChange={() => toggleExecution(plan)}
                            style={{cursor: 'pointer', width: '20px', height: '20px', accentColor: '#30d158'}}
                        />
                    </div>
                    <div style={{width:50, color: theme.text}}>{plan.turn}차</div>
                    <div style={{width:60, color:'#ff453a'}}>{(plan.dropRate * 100).toFixed(0)}%</div>
                    <div style={{width:80, color:'#81b0ff', fontWeight:'bold'}}>
                        {plan.targetPrice > 0 ? plan.targetPrice.toLocaleString(undefined, {maximumFractionDigits:1}) : "-"}
                    </div>
                    <div style={{width:50, fontSize:12, color: theme.text}}>{plan.percent}%</div>
                    <div style={{width:100, textAlign:'right', fontWeight:'bold', color: theme.text}}>
                        {Math.floor(plan.amount).toLocaleString()}
                    </div>
                    <div style={{width:80, textAlign:'right', color: theme.subText, fontSize:12}}>
                        {plan.expectedAvg.toLocaleString(undefined, {maximumFractionDigits:1})}
                    </div>
                </div>
            ))}
        </div>
        
        <div style={styles.totalBar}>
             <span style={{color: theme.text}}>총 매수 운영금 합계</span>
             <span style={{fontSize:18, color:'#30d158'}}>
                 {user ? totalInvested.toLocaleString() : 0} 원
             </span>
        </div>
      </div>

      {/* 정산 목록 (ERP) */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}><h3 style={{color: theme.text}}>💰 {symbol} 실제 매수 기록</h3></div>
        <div style={styles.summaryBox}>
            <div style={{textAlign:'center'}}>
                <div style={{fontSize:12, color: theme.subText}}>현재 실제 평단가</div>
                <div style={{fontSize:24, fontWeight:'bold', color:'#30d158'}}>
                    {realAvgPrice > 0 ? realAvgPrice.toLocaleString(undefined, {maximumFractionDigits: 2}) : "-"}
                </div>
            </div>
        </div>

        {tradeHistory.filter(t => t.symbol === symbol).map((trade) => (
            <div key={trade.id} style={styles.historyItem}>
                 {editingId === trade.id ? (
                    <div style={{display:'flex', gap:5}}>
                        <input type="number" value={editPrice} onChange={(e)=>setEditPrice(e.target.value)} style={styles.smallInput} />
                        <button onClick={()=>saveEdit(trade)} style={styles.saveBtn}>저장</button>
                    </div>
                 ) : (
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                        <div>
                            <span style={{fontWeight:'bold', marginRight:10, color: theme.text}}>{trade.round}차</span>
                            <span style={{color: theme.subText}}>{trade.amount.toLocaleString()}원</span>
                            <span style={{fontSize:12, color: theme.subText, marginLeft:5}}>
                                (@ {trade.price})
                            </span>
                        </div>
                        <div style={{display:'flex', gap:5}}>
                             <button onClick={()=>{setEditingId(trade.id); setEditPrice(trade.price);}} style={styles.editBtn}>수정</button>
                             <button onClick={()=>deleteTrade(trade.id)} style={styles.delBtn}>삭제</button>
                        </div>
                    </div>
                 )}
            </div>
        ))}
      </div>
      <div style={{textAlign:'center', padding:20, color: theme.subText, fontSize:12}}>
        © Nasdaq Tamagotchi V6
      </div>
    </div>
  );
}

// 스타일 생성 함수
const getStyles = (theme) => ({
  container: { maxWidth: '500px', margin: '0 auto', padding: '20px', backgroundColor: theme.bg, color: theme.text, minHeight: '100vh', fontFamily: '-apple-system, sans-serif', transition: 'background 0.3s' },
  loading: { display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', backgroundColor: theme.bg, color: theme.text },
  topBar: { marginBottom: 20 },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 15 },
  logo: { fontSize: 18, fontWeight:'bold', color: theme.text },
  smallBtn: { padding:'5px 10px', fontSize:12, backgroundColor: theme.card, color: theme.subText, border:`1px solid ${theme.border}`, borderRadius:4 },
  loginBtn: { padding:'6px 12px', fontSize:12, backgroundColor:'#4285F4', color:'white', border:'none', borderRadius:4, fontWeight:'bold' },
  
  // 🔥 [Wide 차트] 패딩 제거 및 클리핑
  gaugeSection: { marginBottom: 20, padding: 15, paddingBottom: 0, overflow:'hidden', backgroundColor: theme.card, borderRadius: 15, border: `1px solid ${theme.border}` },

  capitalBox: { backgroundColor: theme.card, padding:15, borderRadius:12, border:`1px solid ${theme.border}`, boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
  capitalInput: { background:'transparent', border:'none', color: theme.text, fontSize:24, fontWeight:'bold', width:'100%', outline:'none' },

  section: { marginBottom: 25, backgroundColor: theme.card, padding:15, borderRadius:15, border:`1px solid ${theme.border}`, boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
  sectionHeader: { marginBottom:15, borderBottom:`1px solid ${theme.border}`, paddingBottom:10 },
  
  tabContainer: { display:'flex', gap:5, marginBottom: 15 },
  tab: { flex:1, padding: '10px', backgroundColor: theme.bg, border:`1px solid ${theme.border}`, color: theme.subText, borderRadius: 8, cursor:'pointer' },
  activeTab: { flex:1, padding: '10px', backgroundColor:'#0a84ff', border:'none', color:'white', borderRadius: 8, fontWeight:'bold' },

  controlGrid: { display:'flex', gap:10, marginBottom:10 },
  controlItem: { flex:1, backgroundColor: theme.bg, padding:10, borderRadius:8, border:`1px solid ${theme.border}` },
  smallInput: { width:'60px', padding:8, borderRadius:4, border:`1px solid ${theme.border}`, textAlign:'center', fontWeight:'bold', fontSize:16, backgroundColor: theme.card, color: theme.text },
  fullInput: { width:'100%', padding:10, borderRadius:6, border:`1px solid ${theme.border}`, backgroundColor: theme.card, color: theme.text, fontSize:16, fontWeight:'bold', marginTop:5 },

  tableScroll: { overflowX:'auto' },
  tableHeader: { display:'flex', fontSize:11, color: theme.subText, paddingBottom:8, borderBottom:`1px solid ${theme.border}`, minWidth:'450px' },
  row: { display:'flex', alignItems:'center', padding:'10px 0', borderBottom:`1px solid ${theme.border}`, fontSize:13, minWidth:'450px' },
  rowExecuted: { display:'flex', alignItems:'center', padding:'10px 0', borderBottom:`1px solid ${theme.border}`, fontSize:13, opacity: 0.4, minWidth:'450px' },
  
  totalBar: { display:'flex', justifyContent:'space-between', marginTop:15, paddingTop:15, borderTop:`1px solid ${theme.border}`, fontWeight:'bold' },

  summaryBox: { backgroundColor: theme.bg, padding:15, borderRadius:10, marginBottom:15, border:`1px solid ${theme.border}` },
  historyItem: { backgroundColor: theme.bg, padding:12, borderRadius:8, marginBottom:8, border:`1px solid ${theme.border}` },
  editBtn: { padding:'4px 8px', backgroundColor:'#4285F4', color:'white', border:'none', borderRadius:4, fontSize:11, cursor:'pointer' },
  delBtn: { padding:'4px 8px', backgroundColor:'#ff453a', color:'white', border:'none', borderRadius:4, fontSize:11, cursor:'pointer' },
  saveBtn: { padding:'4px 8px', backgroundColor:'#30d158', color:'black', border:'none', borderRadius:4, fontSize:11, cursor:'pointer', fontWeight:'bold' }
});