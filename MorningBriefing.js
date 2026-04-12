// Morning Briefing — Scriptable iOS Widget
// Telepítés: 1) Töltsd le a Scriptable appot az App Store-ból
// 2) Másold be ezt a scriptet a Scriptable-be
// 3) Hosszan nyomd a kezdőképernyőt → Widget hozzáadása → Scriptable
// 4) Válaszd ki ezt a scriptet

const METEO="https://api.open-meteo.com/v1/forecast?latitude=47.4979&longitude=19.0402&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe%2FBudapest&forecast_days=1";
const WMO={0:"☀️",1:"🌤️",2:"⛅",3:"☁️",45:"🌫️",48:"🌫️",51:"🌦️",53:"🌦️",55:"🌦️",61:"🌧️",63:"🌧️",65:"🌧️",71:"❄️",73:"❄️",75:"❄️",80:"🌧️",81:"🌧️",82:"⛈️",95:"⛈️",96:"⛈️",99:"⛈️"};
const DAYS=["Vasárnap","Hétfő","Kedd","Szerda","Csütörtök","Péntek","Szombat"];
const MOTIVATIONS=[
  "A fegyelem legyőzi a motivációt.",
  "Kis lépések, nagy eredmények.",
  "Légy jobb, mint tegnap voltál.",
  "Ma is egy lépéssel közelebb a célhoz.",
  "Cselekedj úgy, mintha lehetetlen lenne kudarcot vallani!",
  "Aki kitart, az győz.",
  "A mai erőfeszítésed a holnapi erőd.",
  "Ne várd a pillanatot — teremtsd meg!",
  "Egy Vadász sosem adja fel.",
  "A komfortzónád a legnagyobb ellenséged."
];

async function createWidget(){
  const w=new ListWidget();
  w.backgroundColor=new Color("#020a14");
  w.setPadding(12,14,12,14);

  // Greeting
  const h=new Date().getHours();
  let greet="Szia Ákos!";
  if(h>=6&&h<11)greet="Jó reggelt, Ákos!";
  else if(h>=11&&h<18)greet="Szép napot, Ákos!";
  else if(h>=18&&h<22)greet="Jó estét, Ákos!";
  else greet="Jó éjt, Ákos!";

  const title=w.addText(greet);
  title.font=Font.boldSystemFont(16);
  title.textColor=new Color("#60a5fa");

  w.addSpacer(4);

  // Date
  const now=new Date();
  const dateStr=DAYS[now.getDay()]+", "+now.getFullYear()+". "+(["jan","feb","már","ápr","máj","jún","júl","aug","szep","okt","nov","dec"])[now.getMonth()]+" "+now.getDate()+".";
  const dateTxt=w.addText(dateStr);
  dateTxt.font=Font.systemFont(11);
  dateTxt.textColor=new Color("#334155");

  w.addSpacer(6);

  // Weather
  try{
    const req=new Request(METEO);
    const d=await req.loadJSON();
    const temp=Math.round(d.current.temperature_2m);
    const ico=WMO[d.current.weather_code]||"🌡️";
    const wLine=w.addText(ico+" "+temp+"°C  Budapest");
    wLine.font=Font.semiboldSystemFont(18);
    wLine.textColor=new Color("#e0f2fe");
  }catch(e){
    const wLine=w.addText("⏳ Időjárás...");
    wLine.font=Font.systemFont(13);
    wLine.textColor=new Color("#334155");
  }

  w.addSpacer(6);

  // Daily motivation
  const dayOfYear=Math.floor((now-new Date(now.getFullYear(),0,0))/(1000*60*60*24));
  const mot=MOTIVATIONS[dayOfYear%MOTIVATIONS.length];
  const motTxt=w.addText("💡 "+mot);
  motTxt.font=Font.italicSystemFont(11);
  motTxt.textColor=new Color("#7c3aed");

  w.addSpacer(4);

  // Open app link
  w.url="https://azsoakos-code.github.io/morning-briefing/";

  return w;
}

const widget=await createWidget();
if(config.runsInWidget){
  Script.setWidget(widget);
}else{
  widget.presentMedium();
}
Script.complete();
