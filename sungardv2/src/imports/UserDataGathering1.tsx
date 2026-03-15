import svgPaths from "./svg-ziwe5puqdx";

function Heading() {
  return (
    <div className="absolute content-stretch flex h-[31.992px] items-start left-0 top-0 w-[139.596px]" data-name="Heading 1">
      <p className="font-['Inter:Bold',sans-serif] font-bold leading-[32px] not-italic relative shrink-0 text-[#101828] text-[96px] w-[545px]">SunGuard</p>
    </div>
  );
}

function Container1() {
  return (
    <div className="h-[51px] relative shrink-0 w-[545px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <Heading />
      </div>
    </div>
  );
}

function Container() {
  return (
    <div className="absolute content-stretch flex h-[91px] items-center left-[501px] top-[518px]" data-name="Container">
      <Container1 />
    </div>
  );
}

function Paragraph() {
  return <div className="absolute h-[19.987px] left-[641px] top-[640px] w-[139.596px]" data-name="Paragraph" />;
}

function Icon() {
  return (
    <div className="h-[156px] relative shrink-0 w-[166px]" data-name="Icon">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 166 156">
        <g id="Icon">
          <path d={svgPaths.p16fc6c00} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3329" style={{ stroke: "white", strokeOpacity: "1" }} />
          <path d="M83 13V26" id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3329" style={{ stroke: "white", strokeOpacity: "1" }} />
          <path d="M83 130V143" id="Vector_3" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3329" style={{ stroke: "white", strokeOpacity: "1" }} />
          <path d={svgPaths.p2375b900} id="Vector_4" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3329" style={{ stroke: "white", strokeOpacity: "1" }} />
          <path d={svgPaths.p12acbca0} id="Vector_5" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3329" style={{ stroke: "white", strokeOpacity: "1" }} />
          <path d="M13.8333 78H27.6667" id="Vector_6" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3329" style={{ stroke: "white", strokeOpacity: "1" }} />
          <path d="M138.333 78H152.167" id="Vector_7" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3329" style={{ stroke: "white", strokeOpacity: "1" }} />
          <path d={svgPaths.p823e998} id="Vector_8" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3329" style={{ stroke: "white", strokeOpacity: "1" }} />
          <path d={svgPaths.p43c6240} id="Vector_9" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3329" style={{ stroke: "white", strokeOpacity: "1" }} />
        </g>
      </svg>
    </div>
  );
}

function Container2() {
  return (
    <div className="absolute content-stretch flex h-[328px] items-center justify-center left-[541px] rounded-[27962000px] top-[114px] w-[340px]" data-name="Container" style={{ backgroundImage: "linear-gradient(136.029deg, rgb(255, 137, 4) 0%, rgb(246, 51, 154) 100%)" }}>
      <Icon />
    </div>
  );
}

function Group() {
  return (
    <div className="absolute contents left-[503px] top-[736px]">
      <div className="absolute bg-[#155dfc] h-[143px] left-[503px] opacity-76 rounded-[30px] top-[736px] w-[460px]" />
    </div>
  );
}

function Group1() {
  return (
    <div className="absolute contents left-[503px] top-[736px]">
      <Group />
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[32px] left-[543px] not-italic text-[48px] text-white top-[788px] w-[285px]">Get Started</p>
    </div>
  );
}

function MaterialSymbolsArrowForward({ className }: { className?: string }) {
  return (
    <div className={className || "absolute left-[837px] size-[66px] top-[771px]"} data-name="material-symbols:arrow-forward">
      <div className="absolute inset-[16.67%]" data-name="Vector">
        <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 44 44">
          <path d={svgPaths.p2094dc80} fill="var(--fill-0, white)" id="Vector" style={{ fill: "white", fillOpacity: "1" }} />
        </svg>
      </div>
    </div>
  );
}

function Group3() {
  return (
    <div className="absolute contents left-[503px] top-[910px]">
      <div className="absolute bg-[#155dfc] h-[143px] left-[503px] opacity-76 rounded-[30px] top-[910px] w-[460px]" />
    </div>
  );
}

function Frame() {
  return <div className="absolute h-[52px] left-[533px] top-[952px] w-[132px]" />;
}

function Group2() {
  return (
    <div className="absolute contents left-[503px] top-[910px]">
      <Group3 />
      <Frame />
    </div>
  );
}

export default function UserDataGathering() {
  return (
    <div className="bg-gradient-to-b from-[42.308%] from-[rgba(233,212,255,0.26)] relative shadow-[0px_0px_0px_0px_rgba(0,0,0,0.25)] size-full to-[rgba(140,127,153,0.26)]" data-name="user data gathering_1">
      <div className="absolute bg-[#d9d9d9] h-[1163px] left-0 opacity-19 top-0 w-[1479px]" />
      <Container />
      <Paragraph />
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[20px] left-[565px] not-italic text-[32px] text-black top-[620px] whitespace-nowrap">UV Protection Monitor</p>
      <Container2 />
      <Group1 />
      <MaterialSymbolsArrowForward />
      <Group2 />
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[32px] left-[665px] not-italic text-[48px] text-white top-[962px] whitespace-nowrap">Back</p>
    </div>
  );
}