import svgPaths from "./svg-5ibb8p1z3b";

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
    <div className="absolute content-stretch flex h-[91px] items-center left-[501px] top-[898px]" data-name="Container">
      <Container1 />
    </div>
  );
}

function Heading1() {
  return (
    <div className="absolute content-stretch flex h-[31.992px] items-start left-0 top-0 w-[139.596px]" data-name="Heading 1">
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[32px] not-italic relative shrink-0 text-[#101828] text-[32px] w-[545px]">Username</p>
    </div>
  );
}

function Container2() {
  return (
    <div className="absolute h-[51px] left-[215px] top-[1177px] w-[545px]" data-name="Container">
      <Heading1 />
    </div>
  );
}

function Paragraph() {
  return <div className="absolute h-[19.987px] left-[641px] top-[1020px] w-[139.596px]" data-name="Paragraph" />;
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

function Container3() {
  return (
    <div className="absolute content-stretch flex h-[328px] items-center justify-center left-[541px] rounded-[27962000px] top-[494px] w-[340px]" data-name="Container" style={{ backgroundImage: "linear-gradient(136.029deg, rgb(255, 137, 4) 0%, rgb(246, 51, 154) 100%)" }}>
      <Icon />
    </div>
  );
}

export default function LogIn() {
  return (
    <div className="bg-[rgba(233,212,255,0.26)] relative shadow-[0px_0px_0px_0px_rgba(0,0,0,0.25)] size-full" data-name="Log in">
      <Container />
      <Container2 />
      <Paragraph />
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[20px] left-[565px] not-italic text-[#6a7282] text-[32px] top-[1000px] whitespace-nowrap">UV Protection Monitor</p>
      <Container3 />
      <div className="absolute bg-white h-[143px] left-[202px] opacity-76 rounded-[30px] top-[1228px] w-[1036px]" />
      <div className="absolute bg-[#155dfc] h-[143px] left-[490px] opacity-76 rounded-[30px] top-[1680px] w-[460px]" />
      <div className="absolute bg-white h-[143px] left-[202px] opacity-76 rounded-[30px] top-[1454px] w-[1036px]" />
    </div>
  );
}