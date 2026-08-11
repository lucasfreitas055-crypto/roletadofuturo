import { supabase } from "@/integrations/supabase/client";
import { verificarSouAdmin } from "@/lib/admin.functions";
import type { Session, User } from "@supabase/supabase-js";

export const AuthService = {
  async sessaoAtual(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  /** Sempre revalida com o servidor de autenticação. */
  async usuarioAtual(): Promise<User | null> {
    const { data } = await supabase.auth.getUser();
    return data.user;
  },

  async entrarComEmail(email: string, senha: string) {
    return supabase.auth.signInWithPassword({ email, password: senha });
  },

  async cadastrar(email: string, senha: string, nome: string) {
    const origem = typeof window !== "undefined" ? window.location.origin : "";
    return supabase.auth.signUp({
      email,
      password: senha,
      options: origem ? { data: { nome }, emailRedirectTo: origem } : { data: { nome } },
    });
  },

  async recuperarSenha(email: string) {
    const origem = typeof window !== "undefined" ? window.location.origin : "";
    return supabase.auth.resetPasswordForEmail(
      email,
      origem ? { redirectTo: `${origem}/reset-password` } : {},
    );
  },

  async definirNovaSenha(senha: string) {
    return supabase.auth.updateUser({ password: senha });
  },

  async sair() {
    return supabase.auth.signOut();
  },

  /** Verificação de papel feita no servidor — nunca confiar no cliente. */
  async souAdmin(): Promise<boolean> {
    try {
      const resultado = await verificarSouAdmin();
      return resultado.admin;
    } catch {
      return false;
    }
  },

  aoMudarSessao(callback: (session: Session | null) => void) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
    return () => data.subscription.unsubscribe();
  },
} as const;
