/* K-POP NEXUS city-level concert exploration.
 * City allocations are SIMULATED, not artist tour itineraries or box-office facts.
 */
(() => {
  'use strict';
  const CITY_SPECS = [
    ['도쿄','일본',139.69,35.68,0.46],['오사카','일본',135.50,34.69,0.33],['나고야','일본',136.91,35.18,0.21],
    ['로스앤젤레스','미국',-118.24,34.05,0.34],['뉴욕','미국',-74.01,40.71,0.28],['시카고','미국',-87.63,41.88,0.20],['샌프란시스코','미국',-122.42,37.77,0.18],
    ['상하이','중국',121.47,31.23,0.55],['베이징','중국',116.41,39.90,0.45],
    ['방콕','태국',100.50,13.76,0.72],['치앙마이','태국',98.99,18.79,0.28],
    ['자카르타','인도네시아',106.85,-6.21,0.73],['수라바야','인도네시아',112.75,-7.26,0.27],
    ['타이베이','대만',121.57,25.03,0.73],['가오슝','대만',120.30,22.63,0.27],
    ['베를린','독일',13.40,52.52,0.53],['프랑크푸르트','독일',8.68,50.11,0.47],
    ['파리','프랑스',2.35,48.86,0.69],['리옹','프랑스',4.84,45.76,0.31],
    ['상파울루','브라질',-46.63,-23.55,0.76],['리우데자네이루','브라질',-43.21,-22.91,0.24],
    ['마닐라','필리핀',120.98,14.60,0.71],['세부','필리핀',123.89,10.32,0.29]
  ];
  const COLORS_CITY = ['#6e62da','#ed5e9a','#19a5b7','#eea546'];
  let cityView = 'city';
  let activeCity = null;

  function splitCounts(total, weights) {
    const floored = weights.map(w => Math.floor(total * w));
    let remain = total - floored.reduce((a,b) => a+b,0);
    const fractions = weights.map((w,i) => ({i,f:total*w-floored[i]})).sort((a,b)=>b.f-a.f);
    for (let j=0;j<remain;j++)floored[fractions[j%fractions.length].i]++;
    return floored;
  }
  function cityRecords(rows) {
    const country = countryData(rows);
    const result=[];
    for (const c of country) {
      const items=CITY_SPECS.filter(x=>x[1]===c.name);
      if (!items.length)continue;
      const shares=items.map((x,i)=>{
        // Slight group/year-dependent variation; normalize to the country total.
        const affinity=rows.reduce((acc,r)=>{
          const gi=META.findIndex(m=>m[0]===r.group);
          return acc+(1+0.20*Math.sin((gi+1)*1.7+(i+1)*2.1+(r.year-2022)*0.45))*Math.max(r.concerts,1);
        },0)/Math.max(1,rows.reduce((a,r)=>a+Math.max(r.concerts,1),0));
        return x[4]*affinity;
      });
      const denom=shares.reduce((a,b)=>a+b,0)||1;
      const weights=shares.map(x=>x/denom);
      const shows=splitCounts(c.concerts,weights);
      const attendance=splitCounts(c.audience,weights);
      items.forEach((x,i)=>result.push({city:x[0],country:c.name,lon:x[2],lat:x[3],shows:shows[i],audience:attendance[i],fans:Math.round(c.fans*weights[i]*10)/10,share:Math.round(weights[i]*1000)/10}));
    }
    return result;
  }
  function ensureUI(){
    if(document.getElementById('cityControls'))return;
    const global=document.getElementById('global');
    const map=document.getElementById('p_worldmap');
    if(!global||!map)return;
    const controls=document.createElement('div');controls.id='cityControls';
    controls.style='display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:12px 0 4px';
    controls.innerHTML='<label for="mapLevel" style="color:#394962;font-size:13px;font-weight:700">지도 표시</label><select id="mapLevel" style="padding:9px 12px;border:1px solid #cdd7e9;border-radius:9px;background:white;color:#263752"><option value="city">공연 도시별</option><option value="country">국가별</option></select><span style="color:#76849b;font-size:12px">도시 마커를 클릭하면 아래 도시 목록에서 강조됩니다.</span>';
    map.parentElement.insertBefore(controls,map);
    controls.querySelector('select').onchange=e=>{cityView=e.target.value;render()};
    const grid=global.querySelector('.grid');
    const panel=document.createElement('section');panel.className='panel wide';panel.id='cityPanel';
    panel.innerHTML='<h3>도시별 공연 현황 <span style="font-size:10px;color:#8466bd">가상 데이터</span></h3><div class="hint">공연 도시 23곳 · 공연 횟수와 관객 수는 국가 합계에 맞춰 배분 · 도시를 클릭하면 지도에서 강조</div><div class="plot" id="p_cityRank" style="height:410px"></div><div class="table-wrap" id="cityTable" style="max-height:330px;overflow:auto"></div>';
    grid.insertBefore(panel,document.getElementById('p_groupCountryHeatmap').closest('.panel'));
  }
  function drawCityMap(cityData){
    const parent=document.getElementById('worldmapMarkers');if(!parent)return;
    parent.replaceChildren();
    const maxShows=Math.max(1,...cityData.map(x=>x.shows));
    const ns='http://www.w3.org/2000/svg';
    for(const c of cityData){
      const x=(c.lon+180)*3,y=(90-c.lat)*2.7778;
      const bubble=document.createElementNS(ns,'circle');
      bubble.setAttribute('cx',x);bubble.setAttribute('cy',y);
      bubble.setAttribute('r',c.shows?Math.max(5,5+17*Math.sqrt(c.shows/maxShows)):4);
      bubble.setAttribute('fill',c.shows>maxShows*.65?COLORS_CITY[1]:c.shows>maxShows*.3?COLORS_CITY[0]:COLORS_CITY[2]);
      bubble.setAttribute('fill-opacity','.78');bubble.setAttribute('stroke',c.city===activeCity?'#15203a':'white');bubble.setAttribute('stroke-width',c.city===activeCity?3:1.8);
      bubble.setAttribute('role','button');bubble.setAttribute('tabindex','0');bubble.style.cursor='pointer';
      const title=document.createElementNS(ns,'title');title.textContent=`${c.city} (${c.country}): 공연 ${c.shows}회 · 관객 ${c.audience.toLocaleString('ko-KR')}명 (가상)`;bubble.appendChild(title);
      const show=ev=>{const tip=document.getElementById('worldmapTooltip');const container=document.getElementById('p_worldmap');const rect=container.getBoundingClientRect();tip.innerHTML=`<b>${c.city} · ${c.country}</b><br>공연: ${c.shows.toLocaleString('ko-KR')}회<br>관객: ${c.audience.toLocaleString('ko-KR')}명<br><small>시뮬레이션 수치</small>`;tip.style.display='block';tip.style.left=Math.min(rect.width-195,Math.max(8,ev.clientX-rect.left+10))+'px';tip.style.top=Math.max(4,ev.clientY-rect.top-100)+'px';};
      bubble.onmousemove=show;bubble.onmouseleave=()=>{document.getElementById('worldmapTooltip').style.display='none'};
      bubble.onclick=()=>{activeCity=c.city;const detail=document.getElementById('worldmapSelected');detail.style.display='block';detail.textContent=`${c.city} · ${c.country} / 공연 ${c.shows}회 / 관객 ${c.audience.toLocaleString('ko-KR')}명 (가상)`;drawCityMap(cityData);drawCityTable(cityData)};
      bubble.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();bubble.click()}};
      parent.appendChild(bubble);
    }
  }
  function drawCityTable(data){
    const sorted=[...data].sort((a,b)=>b.shows-a.shows||b.audience-a.audience);
    const target=document.getElementById('cityTable');
    target.innerHTML='<table class="data-table"><thead><tr><th>도시</th><th>국가</th><th>공연 횟수</th><th>관객 수</th></tr></thead><tbody>'+sorted.map(c=>`<tr data-city="${c.city}" style="cursor:pointer;${c.city===activeCity?'background:#eeeafa;font-weight:bold':''}"><td>${c.city}</td><td>${c.country}</td><td>${c.shows.toLocaleString('ko-KR')}회</td><td>${c.audience.toLocaleString('ko-KR')}명</td></tr>`).join('')+'</tbody></table>';
    target.querySelectorAll('[data-city]').forEach(tr=>tr.onclick=()=>{activeCity=tr.dataset.city;drawCityMap(data);drawCityTable(data)});
  }
  const original=renderGlobal;
  renderGlobal=function(rows){
    ensureUI();original(rows);
    const data=cityRecords(rows);
    if(cityView==='city')drawCityMap(data);
    else document.getElementById('worldmapSelected').style.display='none';
    const rank=[...data].sort((a,b)=>b.shows-a.shows).slice(0,12).reverse();
    draw('p_cityRank',[bar(rank.map(x=>x.city),rank.map(x=>x.shows),'#9178df',true)],{showlegend:false,margin:{l:120,r:20,t:15,b:35},xaxis:{title:'공연 횟수 (가상)'},yaxis:{automargin:true}},p=>{activeCity=p.y;drawCityMap(data);drawCityTable(data)});
    drawCityTable(data);
  };
  const text=document.querySelector('#global .hero p');if(text)text.textContent='그룹·연도별 국가 및 주요 공연 도시의 시뮬레이션 결과를 비교합니다.';
})();
