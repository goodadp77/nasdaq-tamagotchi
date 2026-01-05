'use client';

import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';

export default function FlowChart() {
  const [chartOptions, setChartOptions] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 차트 옵션 생성 함수 (정상 데이터 vs 가짜 데이터 공용 사용)
  const generateOptions = (data: number[], isUp: boolean) => {
    const lineColor = isUp ? '#22c55e' : '#3b82f6'; // 상승:초록, 하락:파랑
    const areaColorStart = isUp ? 'rgba(34, 197, 94, 0.5)' : 'rgba(59, 130, 246, 0.5)';
    const areaColorEnd = isUp ? 'rgba(34, 197, 94, 0)' : 'rgba(59, 130, 246, 0)';

    return {
      grid: { top: 5, bottom: 5, left: -20, right: -20, containLabel: false },
      xAxis: { type: 'category', show: false, boundaryGap: false },
      yAxis: { type: 'value', show: false, min: (v: any) => v.min * 0.999, max: (v: any) => v.max * 1.001 }, // 스케일 자동 보정
      series: [{
        data: data,
        type: 'line',
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2, color: lineColor },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: areaColorStart },
              { offset: 1, color: areaColorEnd }
            ]
          }
        },
        animationDuration: 2000,
        animationEasing: 'cubicOut',
      }],
      tooltip: { 
          trigger: 'axis', 
          formatter: '지수: {c}', 
          backgroundColor: 'rgba(0,0,0,0.8)', 
          textStyle: {color:'#fff'}, 
          borderWidth: 0,
          axisPointer: { lineStyle: { color: 'rgba(255,255,255,0.3)' } }
      }
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/market');
        
        // 404 등 에러가 나면 즉시 catch로 이동
        if (!res.ok) throw new Error(`API Error: ${res.status}`);

        const json = await res.json();
        
        if (json.chartData && json.chartData.length > 0) {
          const values = json.chartData.map((d: any) => d.value);
          const isUp = values[values.length - 1] >= values[0];
          setChartOptions(generateOptions(values, isUp));
        } else {
          throw new Error("Empty Data"); // 데이터 비어있으면 catch로 이동
        }

      } catch (error) {
        console.warn("⚠️ API 연결 실패! 비상용 더미 데이터를 가동합니다.", error);
        
        // [비상용] 자연스러운 더미 패턴
        const dummyData = [18100, 18120, 18080, 18150, 18110, 18200, 18250, 18230, 18300, 18280, 18350, 18400];
        setChartOptions(generateOptions(dummyData, true)); // 강제로 그리기
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="w-full h-full animate-pulse bg-gray-800/50 rounded-lg" />;
  
  // 차트가 없으면 에러 메시지 대신 빈 박스라도 보여줌 (레이아웃 깨짐 방지)
  if (!chartOptions) return <div className="w-full h-full bg-gray-900" />;

  return (
    <div className="w-full h-full overflow-hidden rounded-b-xl bg-gray-950/20">
      <ReactECharts option={chartOptions} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}