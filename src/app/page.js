"use client";
import { useState, useEffect } from "react";
import { auth, provider, db } from "../firebase"; 
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, updateDoc, orderBy } from "firebase/firestore";

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // 1. 사용자 입력값
  const [symbol, setSymbol] = useState("TQQQ"); 
  const [seedMoney, setSeedMoney] = useState(10000000); 
  
  // 2. 정산 데이터
  const [tradeHistory, setTradeHistory] = useState([]);
  
  // 3. 수정 모드 상태 (어떤 녀석을 수정 중인지)
  const [editingId, setEditingId] = useState(null);
  const [editPrice, setEditPrice] = useState(""); // 체결가 입력용

  // --- [관리자(Admin) 설정: 시장 상태별 템플릿] ---
  const marketTemplates = {
    "공포": {
      status: "공포 (Fear)",
      level: "orange",
      icon: "🥶",
      color: "#fd7e14",
      desc: "지하실이 있을 수 있습니다. 초반은 정찰병만 보내고(4%), 9~10차에 승부를 거세요.",
      ratios: [4, 4, 4, 8, 8, 8, 12, 12, 20, 20] 
    },
    "주의": {
      status: "주의 (Caution)",
      level: "yellow",
      icon: "🤔",
      color: "#fcc419",
      desc: "방향성이 모호합니다. 8분할로 넓게 그물을 치세요.",
      ratios: [8, 8, 12, 12, 12, 16, 16, 16]
    }
  };

  const currentMarket = marketTemplates["공포"];

  // --- [Firebase 연동] ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      if (currentUser) {
        const q = query(
          collection(db, "trades"), 
          where("uid", "==", currentUser.uid),
          orderBy("date", "desc")
        );
        const unsubscribeDb = onSnapshot(q, (snapshot) => {
          const trades = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setTradeHistory(trades);
        });
        return () => unsubscribeDb();
      } else {
        setTradeHistory([]);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const handleLogin = async () => { try { await signInWithPopup(auth, provider); } catch (e) {} };
  const handleLogout = () => { signOut(auth); };

  // --- [계산 엔진] ---
  const generatePlan = () => {
    const plan = [];
    const ratios = currentMarket.ratios;
    let accumPercent = 0;

    ratios.forEach((percent, index) => {
      const amount = (seedMoney * percent) / 100;
      accumPercent += percent;
      
      const isExecuted = tradeHistory.some(
        t => t.symbol === symbol && t.round === (index + 1) && t.type === 'buy'
      );

      plan.push({
        turn: index + 1,
        percent: percent,
        amount: amount,
        accumPercent: accumPercent,
        isExecuted: isExecuted
      });
    });
    return plan;
  };

  const buyPlan = generatePlan();

  // --- [액션: 체크박스 저장] ---
  const toggleExecution = async (planItem) => {
    if (!user) { alert("로그인이 필요한 기능입니다."); return; }

    if (planItem.isExecuted) {
      alert("이미 정산 내역에 등록된 회차입니다.");
      return;
    }

    if (confirm(`${symbol} ${planItem.turn}회차 매수 기록을 등록하시겠습니까?`)) {
      try {
        await addDoc(collection(db, "trades"), {
          uid: user.uid,
          symbol: symbol,
          type: "buy", 
          round: planItem.turn,
          amount: Math.floor(planItem.amount), 
          price: 0, // 아직 모름 (나중에 입력)
          qty: 0,   // 아직 모름
          date: new Date().toISOString(),
          memo: "자동등록됨"
        });
      } catch (e) {
        console.error("저장 실패", e);
        alert("저장 오류");
      }
    }
  };

  // --- [액션: 삭제] ---
  const deleteTrade = async (id) => {
    if (confirm("삭제하시겠습니까?")) await deleteDoc(doc(db, "trades", id));
  };

  // --- [액션: 수정 시작] ---
  const startEdit = (trade) => {
    setEditingId(trade.id);
    setEditPrice(trade.price === 0 ? "" : trade.price); // 0원이면 빈칸으로
  };

  // --- [액션: 수정 저장 (체결가 입력)] ---
  const saveEdit = async (trade) => {
    if (!editPrice || isNaN(editPrice)) {
      alert("올바른 체결가를 입력해주세요.");
      return;
    }
    
    const priceNum = Number(editPrice);
    const calculatedQty = priceNum > 0 ? trade.amount / priceNum : 0; // 수량 자동 계산

    await updateDoc(doc(db, "trades", trade.id), {
      price: priceNum,
      qty: calculatedQty
    });

    setEditingId(null); // 수정 모드 종료
  };

  // --- [통계 계산: 평단가] ---
  const myTrades = tradeHistory.filter(t => t.symbol === symbol && t.type === 'buy');
  const totalInvested = myTrades.reduce((acc, cur) => acc + cur.amount, 0); // 총 투자금
  const totalQty = myTrades.reduce((acc, cur) => acc + (cur.qty || 0), 0); // 총 수량
  const avgPrice = totalQty > 0 ? totalInvested / totalQty : 0; // 평단가

  if (loading) return <div style={styles.loading}>⏳ 로딩 중...</div>;

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <div style={styles.header}>
        <div style={styles.logo}>🥚 나스닥 다마고치</div>
        {user ? <button onClick={handleLogout} style={styles.smallBtn}>로그아웃</button> 
              : <button onClick={handleLogin} style={styles.loginBtn}>로그인</button>}
      </div>

      {/* 시장 상태 */}
      <div style={{...styles.heroCard, borderColor: currentMarket.color}}>
        <div style={{fontSize: 50, marginBottom:10}}>{currentMarket.icon}</div>
        <div style={{color: currentMarket.color, fontWeight:'bold', fontSize:20}}>{currentMarket.status}</div>
        <div style={styles.descBox}>💡 {currentMarket.desc}</div>
      </div>

      {/* 계산기 */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
            <h3>🧮 전략 계산기</h3>
            <div style={styles.badge}>추천: {currentMarket.ratios.length}분할</div>
        </div>

        <div style={{marginBottom: 20}}>
            <div style={styles.tabContainer}>
                {["TQQQ", "SOXL", "BTC", "ETH"].map((t) => (
                    <button key={t} onClick={() => setSymbol(t)} style={symbol === t ? styles.activeTab : styles.tab}>{t}</button>
                ))}
            </div>
            <label style={{fontSize:12, color:'#888'}}>총 투자 원금</label>
            <input 
                type="text" 
                value={seedMoney.toLocaleString()} 
                onChange={(e) => { const val = e.target.value.replaceAll(',', ''); if(!isNaN(val)) setSeedMoney(Number(val)); }}
                style={styles.input}
            />
        </div>

        <div style={styles.listContainer}>
            <div style={styles.listHeader}>
                <div style={{flex:1}}>실행</div>
                <div style={{flex:1}}>회차</div>
                <div style={{flex:1}}>비중</div>
                <div style={{flex:2, textAlign:'right'}}>매수금액</div>
            </div>
            
            {buyPlan.map((plan) => (
                <div key={plan.turn} style={plan.isExecuted ? styles.rowExecuted : styles.row}>
                    <div style={{flex:1}}>
                        <input 
                            type="checkbox" 
                            checked={plan.isExecuted} 
                            onChange={() => toggleExecution(plan)}
                            style={{cursor: 'pointer', width: '20px', height: '20px', accentColor: '#30d158'}}
                        />
                    </div>
                    <div style={{flex:1, color: plan.isExecuted ? '#666' : 'white'}}>{plan.turn}차</div>
                    <div style={{flex:1, fontSize:12, color:'#888'}}>{plan.percent}%</div>
                    <div style={{flex:2, textAlign:'right', fontWeight:'bold', color: plan.isExecuted ? '#666' : 'white'}}>
                        {Math.floor(plan.amount).toLocaleString()}
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* 정산 시스템 (평단가 추가) */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
            <h3>💰 {symbol} 정산 내역 (ERP)</h3>
        </div>

        {user ? (
            <>
                <div style={styles.summaryBox}>
                    <div style={{textAlign:'center', width:'100%'}}>
                        <div style={{fontSize:12, color:'#888', marginBottom:5}}>나의 {symbol} 평단가</div>
                        <div style={{fontSize:24, fontWeight:'bold', color:'#30d158'}}>
                            {avgPrice > 0 ? avgPrice.toLocaleString(undefined, {maximumFractionDigits: 2}) : "-"} <span style={{fontSize:14, color:'#aaa'}}>원/$</span>
                        </div>
                        <div style={{fontSize:12, color:'#666', marginTop:5}}>
                            총 {totalQty.toFixed(4)}주 / {totalInvested.toLocaleString()}원 매수
                        </div>
                    </div>
                </div>

                <div style={styles.historyList}>
                    {tradeHistory.length === 0 ? (
                        <p style={{textAlign:'center', color:'#666', padding:20}}>체크박스를 누르면 여기에 기록됩니다.</p>
                    ) : (
                        tradeHistory.map((trade) => (
                            <div key={trade.id} style={styles.historyItem}>
                                <div style={{display:'flex', justifyContent:'space-between', marginBottom:8}}>
                                    <span style={{fontWeight:'bold', color:'white', fontSize:14}}>
                                        {trade.symbol} {trade.round}차
                                    </span>
                                    <span style={{fontSize:12, color:'#888'}}>
                                        {new Date(trade.date).toLocaleDateString()}
                                    </span>
                                </div>
                                
                                {editingId === trade.id ? (
                                    // [수정 모드]
                                    <div style={{display:'flex', gap:5, alignItems:'center'}}>
                                        <input 
                                            type="number" 
                                            placeholder="체결가격 입력"
                                            value={editPrice}
                                            onChange={(e) => setEditPrice(e.target.value)}
                                            style={styles.inputEdit}
                                            autoFocus
                                        />
                                        <button onClick={() => saveEdit(trade)} style={styles.saveBtn}>저장</button>
                                        <button onClick={() => setEditingId(null)} style={styles.cancelBtn}>취소</button>
                                    </div>
                                ) : (
                                    // [조회 모드]
                                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                        <div>
                                            <div style={{color:'#ccc', fontSize:14}}>{trade.amount.toLocaleString()}원</div>
                                            <div style={{color:'#666', fontSize:12}}>
                                                {trade.price > 0 ? `@ ${trade.price.toLocaleString()}` : "체결가 입력 필요"} 
                                                {trade.qty > 0 && ` (${trade.qty.toFixed(2)}주)`}
                                            </div>
                                        </div>
                                        <div style={{display:'flex', gap:5}}>
                                            <button onClick={() => startEdit(trade)} style={styles.editBtn}>입력</button>
                                            <button onClick={() => deleteTrade(trade.id)} style={styles.delBtn}>삭제</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </>
        ) : (
            <div style={styles.loginBlur}>
                <p>로그인하면 매매일지가 자동 생성됩니다.</p>
                <button onClick={handleLogin} style={styles.ctaBtnSmall}>구글 로그인</button>
            </div>
        )}
      </div>

      <div style={{marginTop:50, textAlign:'center', color:'#444', fontSize:11}}>
        <p>Copyright © Nasdaq Tamagotchi. All rights reserved.</p>
      </div>
    </div>
  );
}

// 스타일
const styles = {
  container: { maxWidth: '480px', margin: '0 auto', padding: '20px', backgroundColor: '#000000', color: 'white', minHeight: '100vh', fontFamily: '-apple-system, sans-serif' },
  loading: { display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', backgroundColor:'#000', color:'white' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 20 },
  logo: { fontSize: 16, fontWeight:'bold' },
  smallBtn: { padding:'5px 10px', fontSize:12, backgroundColor:'#333', color:'#ccc', border:'none', borderRadius:4, cursor:'pointer' },
  loginBtn: { padding:'6px 12px', fontSize:12, backgroundColor:'#4285F4', color:'white', border:'none', borderRadius:4, cursor:'pointer', fontWeight:'bold' },

  heroCard: { textAlign:'center', padding:'20px', backgroundColor:'#111', borderRadius:15, border:'2px solid #333', marginBottom: 20 },
  descBox: { marginTop:10, fontSize:13, color:'#ccc', lineHeight:1.4, backgroundColor:'rgba(255,255,255,0.05)', padding:10, borderRadius:8 },

  section: { marginBottom: 30, backgroundColor:'#1c1c1e', padding:20, borderRadius:15 },
  sectionHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:15, borderBottom:'1px solid #333', paddingBottom:10 },
  badge: { fontSize:12, backgroundColor:'#333', padding:'4px 8px', borderRadius:4, color:'#ccc' },

  tabContainer: { display:'flex', gap:5, marginBottom: 15, flexWrap:'wrap' },
  tab: { flex:1, padding: '8px', backgroundColor:'#2c2c2e', border:'none', color:'#888', borderRadius: 6, cursor:'pointer', fontSize:13, minWidth:'60px' },
  activeTab: { flex:1, padding: '8px', backgroundColor:'#0a84ff', border:'none', color:'white', borderRadius: 6, cursor:'pointer', fontWeight:'bold', fontSize:13, minWidth:'60px' },
  input: { width:'100%', padding:12, fontSize:20, backgroundColor:'#000', border:'1px solid #333', color:'white', borderRadius:8, textAlign:'right', boxSizing:'border-box', outline:'none', fontWeight:'bold' },

  listContainer: { marginTop: 10 },
  listHeader: { display:'flex', fontSize:12, color:'#666', paddingBottom:8, borderBottom:'1px solid #333', marginBottom:5 },
  row: { display:'flex', alignItems:'center', padding:'12px 0', borderBottom:'1px solid #2c2c2e', fontSize:14 },
  rowExecuted: { display:'flex', alignItems:'center', padding:'12px 0', borderBottom:'1px solid #2c2c2e', fontSize:14, opacity: 0.5, textDecoration:'line-through' },

  summaryBox: { display:'flex', justifyContent:'center', alignItems:'center', backgroundColor:'#000', padding:20, borderRadius:10, marginBottom:15 },
  historyList: { maxHeight:'350px', overflowY:'auto' },
  historyItem: { backgroundColor:'#2c2c2e', padding:15, borderRadius:8, marginBottom:8 },
  
  delBtn: { padding:'5px 10px', backgroundColor:'#ff453a', color:'white', border:'none', borderRadius:4, fontSize:12, cursor:'pointer' },
  editBtn: { padding:'5px 10px', backgroundColor:'#4285F4', color:'white', border:'none', borderRadius:4, fontSize:12, cursor:'pointer' },
  saveBtn: { padding:'8px 12px', backgroundColor:'#30d158', color:'black', border:'none', borderRadius:4, fontSize:12, cursor:'pointer', fontWeight:'bold' },
  cancelBtn: { padding:'8px 12px', backgroundColor:'#333', color:'white', border:'none', borderRadius:4, fontSize:12, cursor:'pointer' },
  inputEdit: { padding:8, borderRadius:4, border:'none', width:'100px', marginRight:5 },

  loginBlur: { textAlign:'center', padding:20, opacity:0.7 },
  ctaBtnSmall: { marginTop:10, padding:'8px 16px', backgroundColor:'#4285F4', color:'white', border:'none', borderRadius:6, cursor:'pointer' }
};