"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Lock, AlertCircle, ArrowRight } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("https://romanydelgado.com/wp-json/jwt-auth/v1/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Limpiamos los tags HTML que WordPress a veces incluye en sus errores.
        const cleanError = data.message 
          ? data.message.replace(/(<([^>]+)>)/gi, "") 
          : "Usuario o contraseña incorrectos";
        throw new Error(cleanError);
      }

      // 1. Guardar en localStorage para uso del cliente
      localStorage.setItem("wp_token", data.token);
      localStorage.setItem("wp_user", JSON.stringify({
        email: data.user_email,
        display_name: data.user_display_name,
      }));

      // 2. Guardar en cookie para que Next.js lo pueda leer en el servidor (Middleware)
      document.cookie = `wp_token=${data.token}; path=/; max-age=86400; secure; samesite=strict`;

      // 3. Redirigir al dashboard tras un login exitoso
      router.push("/dashboard"); 

    } catch (err: any) {
      setError(err.message || "Ocurrió un error al conectar. Por favor, intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950 relative overflow-hidden">
      {/* Fondo de Pantalla / Ambient Optimizados */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('/login-bg.png')] bg-cover bg-center opacity-[0.04]" />
      </div>

      {/* Tarjeta de Login */}
      <div className="w-full max-w-md bg-[#1a1a24]/90 border border-white/5 rounded-[2.5rem] p-8 sm:p-12 shadow-2xl relative z-10 overflow-hidden">
        
        {/* Efecto de brillo superior */}
        <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">Intranet Legal</h1>
          <p className="text-sm text-zinc-400 font-medium leading-relaxed">Acceso exclusivo para el equipo legal. Gestiona e intercambia expedientes de forma segura.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {/* Mensaje de Error Animado */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-200 leading-relaxed">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Input de Usuario */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-zinc-500 group-focus-within:text-blue-400 transition-colors" />
              </div>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full pl-12 pr-4 py-4 bg-zinc-900/50 border border-white/10 rounded-2xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                placeholder="Usuario o correo electrónico"
              />
            </div>

            {/* Input de Contraseña */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-zinc-500 group-focus-within:text-blue-400 transition-colors" />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-12 pr-4 py-4 bg-zinc-900/50 border border-white/10 rounded-2xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                placeholder="Contraseña"
              />
            </div>
          </div>

          {/* Botón Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-semibold rounded-2xl text-white bg-white/10 hover:bg-white/20 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-white/50 transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed overflow-hidden"
          >
            {/* Gradiente dinámico al pasar el cursor */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="relative flex items-center gap-2">
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                  Conectando...
                </>
              ) : (
                <>
                  Ingresar
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </div>
          </button>
        </form>
      </div>
    </div>
  );
}
