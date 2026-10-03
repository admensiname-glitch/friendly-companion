import { Link, createFileRoute } from "@tanstack/react-router";
import { BrandLogo } from "@/components/brand-logo";

export const Route = createFileRoute("/")({
  component: Index,
});

function Icon({name,className=""}:{name:"book"|"target"|"chart"|"arrow";className?:string}){
  const paths={
    book:<><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5z"/><path d="M5 4.5v17"/><path d="M9 6h7"/></>,
    target:<><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/></>,
    chart:<><path d="M4 19V5"/><path d="M4 19h16"/><path d="m7 15 3-4 3 2 5-6"/></>,
    arrow:<><path d="M5 12h13"/><path d="m13 6 6 6-6 6"/></>,
  } as const;
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}

function Index(){
  return <main className="min-h-screen bg-[#EDF2F7] text-[#172334]">
    <header className="border-b border-[#DCE4ED] bg-[#F4F7FA]/95 backdrop-blur">
      <div className="mx-auto flex h-[72px] w-full max-w-[1180px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" aria-label="Ensina-me, página inicial" className="focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-4"><BrandLogo /></Link>
        <nav aria-label="Navegação principal" className="flex items-center gap-1.5">
          <Link to="/login" className="rounded-xl px-3.5 py-2 text-sm font-semibold text-[#556273] hover:bg-[#F4F7FB] hover:text-[#172334]">Entrar</Link>
          <Link to="/cadastro" className="rounded-xl bg-[#0242D7] px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_22px_rgba(2,66,215,0.16)] hover:bg-[#0038B8]">Criar conta</Link>
        </nav>
      </div>
    </header>

    <section className="mx-auto grid w-full max-w-[1180px] gap-10 px-4 pb-14 pt-12 sm:px-6 md:pt-16 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:px-8 lg:pb-20">
      <div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[#DDE7F4] bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#0242D7] shadow-sm">
          Aprendizagem universitária
        </span>
        <h1 className="mt-6 max-w-2xl text-[44px] font-bold leading-[1.03] tracking-[-0.055em] text-[#172334] sm:text-6xl lg:text-[64px]">
          Estude com clareza. Pratique com propósito.
        </h1>
        <p className="mt-6 max-w-xl text-base leading-7 text-[#667487] sm:text-lg">
          O Ensina-me organiza conteúdo, prática, feedback e revisão em uma experiência feita para você realmente entender o que está estudando.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link to="/cadastro" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0242D7] px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(2,66,215,0.17)] hover:bg-[#0038B8]">
            Começar a estudar <Icon name="arrow" className="h-4 w-4"/>
          </Link>
          <Link to="/login" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#D9E2ED] bg-white px-5 text-sm font-bold text-[#445367] hover:border-[#C9D8EA] hover:text-[#0242D7]">
            Já tenho conta
          </Link>
        </div>
      </div>

      <div className="rounded-[26px] border border-[#E2E8F1] bg-white p-3 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
        <div className="rounded-[20px] bg-[#F7F9FC] p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8A95A3]">Hoje</p><p className="mt-1 text-sm font-bold text-[#243245]">Seu próximo passo</p></div>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#0242D7]"><Icon name="target" className="h-4 w-4"/></span>
          </div>
          <div className="mt-4 rounded-2xl bg-[#0242D7] p-5 text-white">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/65">Foco de estudo</p>
            <p className="mt-2 text-xl font-bold tracking-[-0.03em]">Alfabetização e letramento</p>
            <p className="mt-1 text-xs text-white/75">Pedagogia</p>
            <p className="mt-4 text-sm leading-6 text-white/85">Compreenda a diferença entre alfabetização e letramento e veja como os dois processos se articulam.</p>
            <span className="mt-4 inline-flex rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-[#0242D7]">Estudar agora →</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              ["Conteúdo","Base clara para entender"],
              ["Prática","Questões com feedback"],
              ["Revisão","Retome o que importa"],
            ].map(([title,desc])=><div key={title} className="rounded-2xl border border-[#E3E9F1] bg-white p-3.5"><p className="text-xs font-bold text-[#273547]">{title}</p><p className="mt-1 text-[11px] leading-5 text-[#7B8796]">{desc}</p></div>)}
          </div>
        </div>
      </div>
    </section>

    <section className="border-y border-[#DCE4ED] bg-[#F5F8FB]">
      <div className="mx-auto max-w-[1180px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            {icon:"book" as const,title:"Conteúdo que explica",text:"Material organizado em partes curtas, claras e suficientes para construir uma base sólida."},
            {icon:"target" as const,title:"Prática que ensina",text:"Questões, feedback e adaptação para descobrir o que você entendeu de verdade."},
            {icon:"chart" as const,title:"Progresso que faz sentido",text:"Seu histórico orienta revisões e próximos passos sem transformar estudo em burocracia."},
          ].map(item=><article key={item.title} className="rounded-2xl border border-[#E7ECF3] bg-[#FAFBFD] p-5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#0242D7]"><Icon name={item.icon} className="h-[18px] w-[18px]"/></span><h2 className="mt-4 text-sm font-bold text-[#253447]">{item.title}</h2><p className="mt-2 text-sm leading-6 text-[#718093]">{item.text}</p></article>)}
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-[1180px] px-4 py-14 text-center sm:px-6 lg:px-8 lg:py-16">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#0242D7]">Do começo ao domínio</p>
      <h2 className="mx-auto mt-2 max-w-2xl text-3xl font-bold tracking-[-0.04em] text-[#172334] sm:text-4xl">Uma jornada simples para aprender melhor.</h2>
      <div className="mx-auto mt-8 grid max-w-4xl gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {["Conteúdo","Compreensão","Prática","Feedback","Revisão","Domínio"].map((step,index)=><div key={step} className="rounded-2xl border border-[#E7ECF3] bg-white p-4"><span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#EEF4FF] text-xs font-bold text-[#0242D7]">{index+1}</span><p className="mt-3 text-xs font-bold text-[#344154]">{step}</p></div>)}
      </div>
    </section>

    <footer className="border-t border-[#DCE4ED] bg-[#F4F7FA]">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-2 px-4 py-7 text-xs text-[#8A95A3] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex items-center gap-4"><BrandLogo compact /><span>Aprendizagem com clareza.</span></div><nav className="flex items-center gap-4" aria-label="Links legais"><Link to="/termos" className="hover:text-[#0242D7]">Termos de uso</Link><Link to="/privacidade" className="hover:text-[#0242D7]">Privacidade</Link></nav>
      </div>
    </footer>
  </main>;
}
