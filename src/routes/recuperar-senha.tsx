import { Link, createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/brand-logo";

export const Route = createFileRoute("/recuperar-senha")({
  head: () => ({ meta: [{ name: "robots", content: "noindex,nofollow" }] }),
   component: RecuperarSenha });

function RecuperarSenha() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"normal"|"loading"|"success"|"error">("normal");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    setMessage("");
    if (!/^\S+@\S+\.\S+$/.test(normalized)) {
      setStatus("error"); setMessage("Informe um endereço de e-mail válido."); return;
    }
    setStatus("loading");
    const { error } = await supabase.auth.resetPasswordForEmail(normalized, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    if (error) {
      setStatus("error");
      setMessage("Não foi possível enviar o e-mail de recuperação. Tente novamente.");
      return;
    }
    setStatus("success");
    setMessage("Se existir uma conta com esse e-mail, enviaremos as instruções para redefinir sua senha. Confira também a pasta de spam.");
  }

  return <main className="min-h-screen bg-[#F8FAFC] px-6 py-8 text-[#0F172A] sm:py-12">
    <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-md flex-col justify-center">
      <Link to="/" aria-label="Ensina-me, página inicial" className="mb-10 w-fit"><BrandLogo compact /></Link>
      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0242D7]">Recuperar acesso</p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em]">Esqueceu sua senha?</h1>
        <p className="mt-3 text-sm leading-6 text-[#64748B]">Informe seu e-mail e enviaremos um link para criar uma nova senha.</p>
        {message && <div className={`mt-5 rounded-md border px-4 py-3 text-sm ${status === "success" ? "border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]" : "border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]"}`} role={status === "error" ? "alert" : "status"}>{message}</div>}
        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div><label htmlFor="reset-email" className="text-sm font-medium">E-mail</label><input id="reset-email" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} disabled={status==="loading"} required className="mt-2 h-11 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-sm outline-none focus:border-[#0242D7] focus:ring-2 focus:ring-[#BFDBFE]" /></div>
          <button type="submit" disabled={status==="loading"} className="h-11 w-full rounded-md bg-[#0242D7] px-4 text-sm font-semibold text-white disabled:bg-[#94A3B8]">{status==="loading" ? "Enviando..." : "Enviar link de recuperação"}</button>
        </form>
        <p className="mt-7 text-center text-sm text-[#64748B]"><Link to="/login" className="font-semibold text-[#0242D7] hover:underline">Voltar para o login</Link></p>
      </section>
    </div>
  </main>;
}
