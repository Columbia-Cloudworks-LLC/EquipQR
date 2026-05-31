import { supabase } from '@/integrations/supabase/client';
import type { AuthResponse, Session } from '@supabase/supabase-js';

export interface SignUpWithEmailParams {
  email: string;
  password: string;
  emailRedirectTo: string;
  data: Record<string, string>;
  captchaToken?: string;
}

export async function signUpWithEmail(
  params: SignUpWithEmailParams,
): Promise<AuthResponse> {
  const { email, password, emailRedirectTo, data, captchaToken } = params;

  return supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data,
      ...(captchaToken ? { captchaToken } : {}),
    },
  });
}

export async function getCurrentAuthSession(): Promise<{
  session: Session | null;
}> {
  const { data } = await supabase.auth.getSession();
  return { session: data.session };
}
