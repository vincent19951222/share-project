import { LoginForm } from "@/components/login/LoginForm";

export default function LoginPage() {
  return (
    <main className="w-full h-full flex items-center justify-center">
      <div className="w-full max-w-5xl h-[80vh] min-h-[600px] soft-card flex flex-col md:flex-row overflow-hidden relative z-10 bg-white">
        {/* Left: Brand poster */}
        <div className="hidden md:flex w-1/2 relative poster-bg border-r-4 border-slate-100 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 via-slate-900/10 to-slate-900/70"></div>
          <div className="absolute inset-0 p-10 flex flex-col justify-between text-white z-10">
            <div className="font-black text-3xl tracking-tighter flex items-center gap-2 drop-shadow-md">
              <div className="w-10 h-10 bg-yellow-300 border-2 border-slate-800 rounded-xl flex items-center justify-center shadow-[0_3px_0_0_#1f2937] p-1.5">
                <svg viewBox="0 0 24 24" className="w-full h-full text-slate-800" fill="#fcd34d" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="8" width="18" height="13" rx="2" />
                  <path d="M2 8h20M12 8v13M8 13h8" />
                </svg>
              </div>
              脱脂牛马
            </div>
            <div className="flex flex-col gap-2">
              <span className="px-3 py-1 bg-yellow-300/90 text-slate-900 text-xs font-bold rounded-md w-max border-2 border-slate-800 shadow-[2px_2px_0px_0px_#1f2937]">
                共同成长
              </span>
              <h1 className="text-4xl font-black leading-tight drop-shadow-lg">
                打卡不仅仅是
                <br />
                完成任务，
                <br />
                更是团队的荣誉。
              </h1>
            </div>
          </div>
        </div>

        {/* Right: Login form */}
        <div className="w-full md:w-1/2 p-8 md:p-14 flex flex-col justify-center bg-white">
          <div className="mb-10">
            <h2 className="text-3xl font-black mb-2 text-slate-800">加入团队</h2>
            <p className="text-sub font-bold text-sm">输入你的用户名和密码，准备开始协同挑战。</p>
          </div>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
